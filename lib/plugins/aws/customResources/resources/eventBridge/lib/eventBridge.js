'use strict';

const EventBridge = require('aws-sdk/clients/eventbridge');

function updateRuleConfiguration(config) {
  const { ruleName, eventBusName, pattern, schedule, region } = config;
  const eventBridge = new EventBridge({ region });

  return eventBridge
    .putRule({
      Name: ruleName,
      EventBusName: eventBusName,
      EventPattern: JSON.stringify(pattern),
      ScheduleExpression: schedule,
      State: 'ENABLED',
    })
    .promise();
}

function removeRuleConfiguration(config) {
  const { ruleName, eventBusName, region } = config;
  const eventBridge = new EventBridge({ region });

  return eventBridge
    .deleteRule({
      Name: ruleName,
      EventBusName: eventBusName,
    })
    .promise();
}

function updateTargetConfiguration(config) {
  const { lambdaArn, ruleName, eventBusName, input, inputPath, inputTransformer, region } = config;
  const eventBridge = new EventBridge({ region });

  let target = {
    Arn: lambdaArn,
    Id: `${ruleName}-target`,
  };

  if (input) {
    target = Object.assign(target, { Input: JSON.stringify(input) });
  } else if (inputPath) {
    target = Object.assign(target, { InputPath: inputPath });
  } else if (inputTransformer) {
    target = Object.assign(target, { InputTransformer: inputTransformer });
  }

  return removeTargetConfiguration(config).then(() =>
    eventBridge
      .putTargets({
        Rule: ruleName,
        EventBusName: eventBusName,
        Targets: [target],
      })
      .promise()
  );
}

function removeTargetConfiguration(config) {
  const { ruleName, eventBusName, region } = config;
  const eventBridge = new EventBridge({ region });

  return eventBridge
    .removeTargets({
      Ids: [`${ruleName}-target`],
      Rule: ruleName,
      EventBusName: eventBusName,
    })
    .promise();
}

module.exports = {
  updateRuleConfiguration,
  removeRuleConfiguration,
  updateTargetConfiguration,
  removeTargetConfiguration,
};
