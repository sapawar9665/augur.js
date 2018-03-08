#!/usr/bin/env node

"use strict";

var chalk = require("chalk");
var getTime = require("./get-timestamp");
var setTimestamp = require("./set-timestamp");
var displayTime = require("./display-time");
var doInitialReport = require("./do-initial-report");
var getPrivateKeyFromString = require("../dp/lib/get-private-key").getPrivateKeyFromString;
var getPayoutNumerators = require("./get-payout-numerators");

/**
 * Move time to Market end time and do initial report
 */
function initialReportInternal(augur, marketId, outcome, userAuth, invalid, auth, callback) {
  augur.markets.getMarketsInfo({ marketIds: [marketId] }, function (err, marketsInfo) {
    var market = marketsInfo[0];
    var marketPayload = { tx: { to: marketId } };
    augur.api.Market.getEndTime(marketPayload, function (err, endTime) {
      displayTime("Market End Time", endTime);
      getTime(augur, auth, function (err, timeResult) {
        if (err) {
          console.log(chalk.red(err));
          return callback(err);
        }
        var day = 108000; // day
        endTime = parseInt(endTime, 10) + (day * 3); // push time after designated reporter time
        displayTime("Move time to ", endTime);
        setTimestamp(augur, endTime, timeResult.timeAddress, auth, function (err) {
          if (err) {
            console.log(chalk.red(err));
            return callback(err);
          }
          var payoutNumerators = getPayoutNumerators(market, outcome, invalid);
          doInitialReport(augur, marketId, payoutNumerators, invalid, userAuth, function (err) {
            if (err) {
              console.log(chalk.red(err));
              return callback(err);
            }
            console.log(chalk.green("Initial Report Done"));
            callback(null);
          });
        });
      });
    });
  });
}

function help(callback) {
  console.log(chalk.red("params syntax --> marketId,0,<user priv key>,false"));
  console.log(chalk.red("parameter 1: marketId is needed"));
  console.log(chalk.red("parameter 2: outcome is needed"));
  console.log(chalk.red("parameter 3: user priv key is needed, env var REPORTER_PRIVATE_KEY can be used, or blank to use ETHEREUM_PRIVATE_KEY"));
  console.log(chalk.red("parameter 4: invalid is optional, default is false"));
  console.log(chalk.yellow("user will be give REP if balance is 0"));
  console.log(chalk.yellow("for scalar markets outcome is the value between min and max"));
  callback(null);
}

function initialReport(augur, params, auth, callback) {
  if (!params || params === "help" || params.split(",").length < 2) {
    help(callback);
  } else {
    var paramArray = params.split(",");
    var invalid = paramArray.length === 4 ? paramArray[3] : false;
    var marketId = paramArray[0];
    var outcomeId = paramArray[1];
    var userAuth = null;
    if (process.env.REPORTER_PRIVATE_KEY) {
      userAuth = getPrivateKeyFromString(process.env.REPORTER_PRIVATE_KEY);
    } else if (paramArray[2] !== undefined) {
      userAuth = getPrivateKeyFromString(paramArray[2]);
    }
    if (userAuth === null) {
      userAuth = auth;
    }

    console.log(chalk.yellow.dim("marketId"), marketId);
    console.log(chalk.yellow.dim("outcome"), outcomeId);
    console.log(chalk.yellow.dim("reporter"), userAuth.address);
    console.log(chalk.yellow.dim("owner"), auth.address);
    console.log(chalk.yellow.dim("invalid"), invalid);
    initialReportInternal(augur, marketId, outcomeId, userAuth, invalid, auth, callback);
  }
}

module.exports = initialReport;