'use strict';

const _ = require('lodash');
const { addCustomResourceToService } = require('../../../../customResources');

class AwsCompileEventBridgeEvents {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');

    this.hooks = {
      'package:compileEvents': this.compileEventBridgeEvents.bind(this),
    };
  }

  compileEventBridgeEvents() {
    const { service } = this.serverless;
    const { provider } = service;
    const { compiledCloudFormationTemplate } = provider;
    const iamRoleStatements = [];

    service.getAllFunctions().forEach(functionName => {
      const functionObj = service.getFunction(functionName);
      const FunctionName = functionObj.name;

      if (functionObj.events) {
        functionObj.events.forEach((event, idx) => {
          if (typeof event.eventBridge === 'object') {
            idx++;

            const EventBus = event.eventBridge.eventBus;
            const Schedule = event.eventBridge.schedule;
            const Pattern = event.eventBridge.pattern;
            const Input = event.eventBridge.input;
            const InputPath = event.eventBridge.inputPath;
            let InputTransformer = event.eventBridge.inputTransformer;
            const RuleName = `${FunctionName}-rule-${idx}`;

            // TODO: check if more than one `input` type is provided

            const eventFunctionLogicalId = this.provider.naming.getLambdaLogicalId(functionName);
            const customResourceFunctionLogicalId = this.provider.naming.getCustomResourceEventBridgeHandlerFunctionLogicalId();
            const customEventBridgeResourceLogicalId = this.provider.naming.getCustomResourceEventBridgeResourceLogicalId(
              functionName,
              idx
            );

            const inputOptions = [Input, InputPath, InputTransformer].filter(i => i);
            if (inputOptions.length > 1) {
              const errorMessage = [
                'You can only set one of input, inputPath, or inputTransformer ',
                'properties for eventBridge events.',
              ].join('');
              throw new this.serverless.classes.Error(errorMessage);
            }

            if (InputTransformer) {
              const config = Object.assign({}, InputTransformer);
              InputTransformer = {};
              if (!config.inputTemplate) {
                throw new this.serverless.classes.Error(
                  'The inputTemplate key is required when specifying an ' +
                    'inputTransformer for an eventBridge event'
                );
              }
              InputTransformer.InputTemplate = config.inputTemplate;
              if (config.inputPathsMap) {
                InputTransformer.InputPathsMap = config.inputPathsMap;
              }
            }

            const customEventBridge = {
              [customEventBridgeResourceLogicalId]: {
                Type: 'Custom::EventBridge',
                Version: 1.0,
                DependsOn: [eventFunctionLogicalId, customResourceFunctionLogicalId],
                Properties: {
                  ServiceToken: {
                    'Fn::GetAtt': [customResourceFunctionLogicalId, 'Arn'],
                  },
                  FunctionName,
                  EventBridgeConfig: {
                    RuleName,
                    EventBus,
                    Schedule,
                    Pattern,
                    Input,
                    InputPath,
                    InputTransformer,
                  },
                },
              },
            };

            _.merge(compiledCloudFormationTemplate.Resources, customEventBridge);

            let Resource = `arn:aws:events:*:*:rule/${RuleName}`;
            if (EventBus) {
              Resource = `arn:aws:events:*:*:rule/${EventBus}/${RuleName}`;
            }

            iamRoleStatements.push({
              Effect: 'Allow',
              Resource,
              Action: [
                'events:PutRule',
                'events:RemoveTargets',
                'events:PutTargets',
                'events:DeleteRule',
              ],
            });
          } else {
            const errorMessage = [
              `Event Bridge event of function "${functionName}" is not an object`,
              ' Please check the docs for more info.',
            ].join('');
            throw new this.serverless.classes.Error(errorMessage);
          }
        });
      }

      iamRoleStatements.push({
        Effect: 'Allow',
        Resource: `arn:aws:lambda:*:*:function:${FunctionName}`,
        Action: ['lambda:AddPermission', 'lambda:RemovePermission'],
      });
    });

    if (iamRoleStatements.length) {
      return addCustomResourceToService.call(this, 'eventBridge', iamRoleStatements);
    }

    return null;
  }
}

module.exports = AwsCompileEventBridgeEvents;
