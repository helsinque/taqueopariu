*/*jslint node: true, stupid: true */
/* global require */

'use strict';

var TELEGRAM_KEY = "DEFAULT_TELEFRAM_KEY";
var TELEGRAM_DEFAULT_CHAT = "DEFAULT_CHAT_ID";

var fs = require("fs"),
        request = require("request"),
        async = require("async"),
        assert = require("assert"),
        argv = require("process").argv,
        log = require("loglevel"),
        sprintf = require("sprintf").sprintf,
        xpath = require("xpath"),
        Dom = require("xmldom").DOMParser,
        Getopt = require("node-getopt"),
        mongoose = require("mongoose"),
        ZabbixSender = require("zabbix-sender");

var opt = new Getopt([
    ["c", "configuration=ARG", "Suite de testes"],
    ["n", "threads=ARG", "Quantidade de threads por grupo"],
    ["t", "timeout=ARG", "Timeout da requisição"],
    ["l", "loglevel=ARG", "trace, debug, warn, error"],
    ["h", "help", "Exibe alguma ajuda"],
    ["i", "interval", "Intervalo entre os testes"],
    ["t", "telegramchat=ARG", "Chat que as mensagens vão chegar"],
    ["d", "database=ARG", "URL de acesso do mongo"]]).bindHelp().parseSystem();

var sender = new ZabbixSender();
mongoose.connect(opt.options.database || "mongodb://localhost/bipbop-admin");

var IntegrationTestsResult = mongoose.model("integrationTests", {
    group: {type: String, required: true},
    name: {type: String, required: true},
    date: {type: Date, default: Date.now, required: true},
    success: {type: Boolean, required: true},
    failReason: {type: String, required: false},
    responseTime: {type: Number, required: true}
});

log.setLevel(opt.options.loglevel || "error");

assert.ok(opt.options.configuration);
assert.ok(fs.existsSync(opt.options.configuration));

var TestSuite = function (group, test, parameters, callback) {

    var failReason,
            responseTime = 0;

    this.fail = function (reason) {
        failReason = reason;
        return this;
    };

    this.check = function (data) {
        var doc = new Dom().parseFromString(data),
                fail = null;

        parameters.xpath.forEach(function (query) {
            if (!xpath.select(parameters.xpath[query], doc)) {
                fail = sprintf("O XPATH %s falhou", parameters.xpath[query]);
                this.fail(fail);
                return false;
            }
        });
        return true;
    };

    this.responseTime = function (ms) {
        assert.ok(typeof ms === "number");
        responseTime = ms;
        return this;
    };

    this.save = function () {
        new IntegrationTestsResult({
            group: group,
            name: test,
            success: !failReason,
            failReason: failReason,
            responseTime: responseTime
        }).save(function (error) {
            if (error) {
                log.error(sprintf("Mongoose Failure: %s", JSON.stringify(error)));
            }

            if (failReason) {
                
                request.post({
                    url: sprintf("https://api.telegram.org/bot%s/sendMessage", TELEGRAM_KEY),
                    form: {
                        chat_id: parseInt(opt.options.telegramchat, 10) || TELEGRAM_DEFAULT_CHAT,
                        text: sprintf("O teste %s - %s do grupo %s falhou, URL %s - Motivo: %s.", test, parameters.description, group, parameters.url, failReason),
                        disable_web_page_preview: true
                    }
                }, function (err, http, body) {
                    log.debug(sprintf("err %s http %s body", err, JSON.stringify(http), body));
                });
            }

            var zabbixDict = {};
            zabbixDict[["taqueopariu", group, test].join(".")] = {
                success: !failReason ? "passed" : "failure",
                failReason: failReason,
                responseTime: responseTime
            };

            sender.send(zabbixDict, function () {
                if (error) {
                    log.error(sprintf("Zabbix Failure: %s", JSON.stringify(error)));
                }
                callback();
            });

        });

    };

    return this;
};

var performTest = function (group) {
    return function (parameters, test, callback) {
        var testInstance = new TestSuite(group, test, parameters, callback),
                idx = sprintf("[%s:%s]", group, test),
                init = new Date();

        log.info(sprintf("%s Executando o teste %s", idx, parameters.description));

        request({
            method: "GET",
            url: "aaa" + parameters.url,
            timeout: (opt.options.timeout ? parseInt(opt.options.timeout, 10) : 300) * 1000
        }, function (error, response, body) {
            log.info(sprintf("%s Recebemos a resposta do teste", idx));
            if (!error && response.statusCode === 200) {
                log.info(sprintf("%s A resposta contém conteúdo, verificando", idx));
                if (!testInstance.check(body)) {
                    log.error(sprintf("%s A requisição não pode ser realizada", idx));
                }
            } else {
                var msg = sprintf("Falhou a requisição HTTP: %s", error);
                testInstance.fail(msg);
                log.error(sprintf("%s %s", idx, msg));
            }
            testInstance.responseTime(new Date() - init).save();
        });
    };
};

var groupTest = function (tests, group, callback) {
    async.forever(function (next) {
        log.info(sprintf("Inicializando os testes do grupo %s", group));
        async.forEachOfLimit(tests, opt.options.threads ? parseInt(opt.options.threads, 10) : 2, performTest(group), function () {
            log.info(sprintf("Terminando os testes os testes do grupo %s", group));
            setTimeout(next, (opt.options.interval ? parseInt(opt.options.interval, 10) : 60 * 60) * 1000);
        });
    }, function (err) {
        log.error(err);
        callback();
    });
};

async.forever(function (next) {
    async.forEachOf(JSON.parse(fs.readFileSync(opt.options.configuration)), groupTest, function () {
        next();
    });
}, function (err) {
    log.error(err);
    mongoose.connection.close();
});
