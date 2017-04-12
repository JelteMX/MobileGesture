/*
    MobileGesture
    ========================

    @file      : MobileGesture.js
    @version   : 1,0
    @author    : Nick Ford
    @date      : Sun, 28 Feb 2016 16:03:31 GMT
    @copyright : Mendix
    @license   : Apache 2
*/

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dojo/query",
    "dojo/_base/lang",
    "dojo/_base/event",
    "MobileGesture/lib/hammer",
    "dojo/NodeList-traverse"
], function(declare, _WidgetBase, query, lang, dojoEvent, Hammer) {
    "use strict";

    var MxContext = mendix.lib.MxContext;

    return declare("MobileGesture.widget.MobileGesture", [ _WidgetBase], {

        // Parameters configured in the Modeler.
        mfToExecuteRight: "",
        mfToExecuteLeft: "",
        mfToExecuteUp: "",
        mfToExecuteDown: "",
        mfToExecutePress: "",
        mfToExecuteDoubleTap: "",

        pageToOpenRight: "",
        pageToOpenLeft: "",
        pageToOpenUp: "",
        pageToOpenDown: "",

        elementSelector : "",
        parentOfNode: false,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _contextObj: null,
        _setup: false,

        // handles
        _onPress: null,
        _onSwipe: null,
        _onDoubleTap: null,

        // Manager
        _mc: null,

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            logger.level(logger.DEBUG);
        },

        update: function(obj, callback) {
            logger.debug(this.id + ".update");
            this._contextObj = obj;
            this._executeCallback(callback, "update");
            if (!this._setup) {
                this._runInTimeout(lang.hitch(this, function () {
                    this._setupEvents(callback);
                }));
            } else {
                this._executeCallback(callback, "update");
            }
        },

        _stopBubblingEventOnMobile: function(e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        _runInTimeout: function (func) {
            logger.debug(this.id + "._runInTimeout");
            setTimeout(func, this.timeout);
        },

        _setupEvents: function(callback) {
            logger.debug(this.id + "._setupEvents");

            var validSelectors = [
                "body", "head", "html"
            ];
            if (this.elementSelector.indexOf(".") === -1 && this.elementSelector.indexOf("#") === -1 && validSelectors.indexOf(this.elementSelector)) {
                this.elementSelector = "." + this.elementSelector;
            }

            var bindClass;
            if (this.parentOfNode) {
                bindClass = query(this.domNode).closest(this.elementSelector);
            } else {
                bindClass = query(this.elementSelector);
                if (bindClass) {
                    bindClass = bindClass.first();
                }
            }

            if (bindClass && bindClass.length) {
                // Set Manager
                this._mc = new Hammer(bindClass[0], { touchAction: "auto" });

                this._mc.get("swipe").set({ direction: Hammer.DIRECTION_ALL });

                // Set onPress handler
                this._onPress = lang.hitch(this, function(ev) {
                    logger.debug(this.id + ".mc press");
                    this._executeMF(this._contextObj, this.mfToExecutePress);
                });

                // Set onPanEnd handler (swipe)
                this._onSwipe = lang.hitch(this, function(ev) {
                    logger.debug(this.id + ".mc swipe");

                    var action = "";
                    var actionValue = "";

                    if (ev.direction === Hammer.DIRECTION_RIGHT) {
                        action = this.mfToExecuteRight !== "" ? "microflow" : "page";
                        actionValue = this.mfToExecuteRight !== "" ? this.mfToExecuteRight : this.pageToOpenRight;
                    } else if (ev.direction === Hammer.DIRECTION_LEFT) {
                        action = this.mfToExecuteLeft !== "" ? "microflow" : "page";
                        actionValue = this.mfToExecuteLeft !== "" ? this.mfToExecuteLeft : this.pageToOpenLeft;
                    } else if (ev.direction === Hammer.DIRECTION_UP) {
                        action = this.mfToExecuteUp !== "" ? "microflow" : "page";
                        actionValue = this.mfToExecuteUp !== "" ? this.mfToExecuteUp : this.pageToOpenUp;
                    } else if (ev.direction === Hammer.DIRECTION_DOWN) {
                        action = this.mfToExecuteDown !== "" ? "microflow" : "page";
                        actionValue = this.mfToExecuteDown !== "" ? this.mfToExecuteDown : this.pageToOpenDown;
                    }

                    if (actionValue === "") {
                        return;
                    }

                    if (action === "page") {
                        this._openPage(this._contextObj, actionValue);
                    } else if (action === "microflow") {
                        this._executeMF(this._contextObj, actionValue);
                    }
                });

                // Set onTap handler
                this._onDoubleTap = lang.hitch(this, function(ev) {
                    logger.debug(this.id + ".mc doubletap");
                    this._executeMF(this._contextObj, this.mfToExecuteDoubleTap);
                });

                this._mc.on("press", this._onPress);
                this._mc.on("doubletap", this._onDoubleTap);
                this._mc.on("swipe", this._onSwipe);
            } else {
                logger.warn(this.id + "._setupEvents no class found in " + this.bindClass);
            }

            this._setup = true;
            this._executeCallback(callback, "_setupEvents");
        },

        _executeMF: function (obj, mf, callback) {
            if (!callback) {
                callback = lang.hitch(this, function () {
                    logger.debug(this.id + "_executeMF mf: '" + mf + "' called");
                });
            }
            if (mf !== "") {
                logger.debug(this.id + "._executeMF");
                var guids = obj && obj.getGuid ? [ obj.getGuid() ] : [];
                mx.ui.action(mf, {
                    params: {
                        applyto: "selection",
                        guids: guids
                    },
                    callback: callback,
                    error: lang.hitch(this, function(error) {
                        logger.error(this.id + ": An error occurred while executing microflow: " + error.description);
                    })
                }, this);
            }
        },

        _openPage: function (obj, formName) {
            logger.debug(this.id + "._openPage " + formName);
            var formArgs = {
                location: "content",
                callback: function () {
                    logger.debug(this.id + "._openPage cb success");
                },
                error: function (err) {
                    logger.debug(this.id + "._openPage cb error");
                    console.warn(err);
                }
            };

            if (obj) {
                var context = new MxContext();
                context.setTrackObject(obj);
                formArgs.context = context;
            }

            mx.ui.openForm(formName, formArgs, this);
        },

        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            if (this._mc) {
                this._mc.off("press", this._onPress);
                this._mc.off("doubletap", this._onDoubleTap);
                this._mc.off("swipe", this._onSwipe);
            }
        },

        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["MobileGesture/widget/MobileGesture"]);
