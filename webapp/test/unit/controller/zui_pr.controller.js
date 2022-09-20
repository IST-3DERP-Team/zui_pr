/*global QUnit*/

sap.ui.define([
	"zui_pr/controller/zui_pr.controller"
], function (Controller) {
	"use strict";

	QUnit.module("zui_pr Controller");

	QUnit.test("I should test the zui_pr controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
