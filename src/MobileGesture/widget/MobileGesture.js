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
    "dojo/NodeList-traverse",
], function(declare, _WidgetBase, query, lang, dojoEvent, Hammer) {
    "use strict";

    return declare("MobileGesture.widget.MobileGesture", [ _WidgetBase], {

        // Parameters configured in the Modeler.
        mfToExecuteRight: "",
        mfToExecuteLeft: "",
        mfToExecuteTop: "",
        mfToExecuteBottom: "",
        mfToExecutePress: "",
        mfToExecuteDoubleTap: "",

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
        },

        update: function(obj, callback) {
            logger.debug(this.id + ".update");
            this._contextObj = obj;
            callback();
            if (!this._setup) {
                this._runInTimeout(lang.hitch(this, function () {
                    this._setupEvents();
                }));
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
                this._mc = new Hammer(bindClass[0]);

                // Set onPress handler
                this._onPress = lang.hitch(this, function(ev) {
                    logger.debug(this.id + ".mc press");
                    this._executeMF(this._contextObj, this.mfToExecutePress);
                });

                // Set onPanEnd handler (swipe)
                this._onSwipe = lang.hitch(this, function(ev) {
                    logger.debug(this.id + ".mc swipe");

                    var mfToExecute = "";
                    if (ev.direction === Hammer.DIRECTION_RIGHT) {
                        mfToExecute = this.mfToExecuteRight;
                    } else if (ev.direction === Hammer.DIRECTION_LEFT) {
                        mfToExecute = this.mfToExecuteLeft;
                    } else if (ev.direction === Hammer.DIRECTION_UP) {
                        mfToExecute = this.mfToExecuteTop;
                    } else if (ev.direction === Hammer.DIRECTION_DOWN) {
                        mfToExecute = this.mfToExecuteDown;
                    }

                    this._executeMF(this._contextObj, mfToExecute);
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
            mendix.lang.nullExec(callback);
        },

        _executeMF: function (obj, mf, callback) {
            logger.debug(this.id + "._executeMF");
            if (!callback) {
                callback = lang.hitch(this, function () {
                    logger.debug(this.id + "_executeMF mf: '" + mf + "' called");
                });
            }
            if (mf !== "") {
                var guids = [];
                if (obj) {
                    guids = [ obj.getGuid() ];
                }
                mx.data.action({
                    params: {
                        applyto: "selection",
                        actionname: mf,
                        guids: guids
                    },
                    store: {
                        caller: this.mxform
                    },
                    callback: callback,
                    error: lang.hitch(this, function(error) {
                        logger.error(this.id + ": An error occurred while executing microflow: " + error.description);
                    })
                }, this);
            }
        },

        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            if (this._mc) {
                this._mc.off("press", this._onPress);
                this._mc.off("tap", this._onDoubleTap);
                this._mc.off("swipe", this._onSwipe);
            }
        }
    });
});

require(["MobileGesture/widget/MobileGesture"], function() {
    "use strict";
});
