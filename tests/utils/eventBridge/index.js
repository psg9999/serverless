'use strict';

const AWS = require('aws-sdk');
const { region, persistentRequest } = require('../misc');

function createEventBus(name) {
  const eventBridge = new AWS.EventBridge({ region });

  return eventBridge.createEventBus({ Name: name }).promise();
}

function deleteEventBus(name) {
  const eventBridge = new AWS.EventBridge({ region });

  return eventBridge.deleteEventBus({ Name: name }).promise();
}

function putEvents(eventBusName, source) {
  const eventBridge = new AWS.EventBridge({ region });

  const params = {
    Entries: [{ EventBusName: eventBusName, Source: source }],
  };
  return eventBridge.putEvents(params).promise();
}

module.exports = {
  createEventBus: persistentRequest.bind(this, createEventBus),
  deleteEventBus: persistentRequest.bind(this, deleteEventBus),
  putEvents: persistentRequest.bind(this, putEvents),
};
