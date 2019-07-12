'use strict';

const path = require('path');
const { expect } = require('chai');

const { getTmpDirPath } = require('../../utils/fs');
const { createEventBus, putEvents, deleteEventBus } = require('../../utils/eventBridge');
const {
  createTestService,
  deployService,
  removeService,
  waitForFunctionLogs,
} = require('../../utils/misc');
const { getMarkers } = require('../shared/utils');

describe('AWS - Event Bridge Integration Test', () => {
  let serviceName;
  let stackName;
  let tmpDirPath;
  let customEventBusName;
  const eventSource = 'serverless.test';
  const stage = 'dev';

  beforeAll(() => {
    tmpDirPath = getTmpDirPath();
    console.info(`Temporary path: ${tmpDirPath}`);
    const serverlessConfig = createTestService(tmpDirPath, {
      templateDir: path.join(__dirname, 'service'),
      filesToAdd: [path.join(__dirname, '..', 'shared')],
      serverlessConfigHook:
        // Ensure unique event bus names for each test (to avoid collision among concurrent CI runs)
        config => {
          customEventBusName = `${config.service}-event-bus`;
          config.functions.eventBusCustom.events[0].eventBridge.eventBus = customEventBusName;
        },
    });

    serviceName = serverlessConfig.service;
    stackName = `${serviceName}-${stage}`;
    // create an external Event Bus
    // NOTE: deployment can only be done once the Event Bus is created
    console.info(`Creating Event Bus "${customEventBusName}"...`);
    return createEventBus(customEventBusName).then(() => {
      console.info(`Deploying "${stackName}" service...`);
      deployService();
    });
  });

  afterAll(() => {
    console.info('Removing service...');
    removeService();
    console.info(`Deleting Event Bus "${customEventBusName}"...`);
    return deleteEventBus(customEventBusName);
  });

  describe('Default Event Bus', () => {
    it('should invoke function when an event is sent to the event bus', () => {
      const functionName = 'eventBusDefault';
      const markers = getMarkers(functionName);

      return putEvents('default', eventSource)
        .then(() => waitForFunctionLogs(functionName, markers.start, markers.end))
        .then(logs => {
          console.log(logs);
          expect(logs).to.include('test');
        });
    });
  });

  describe('Custom Event Bus', () => {
    it('should invoke function when an event is sent to the event bus', () => {
      const functionName = 'eventBusCustom';
      const markers = getMarkers(functionName);

      return putEvents(customEventBusName, eventSource)
        .then(() => waitForFunctionLogs(functionName, markers.start, markers.end))
        .then(logs => {
          console.log(logs);
          expect(logs).to.include('test');
        });
    });
  });
});
