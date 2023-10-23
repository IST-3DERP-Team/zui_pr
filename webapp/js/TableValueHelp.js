sap.ui.define([ 
    "sap/ui/model/json/JSONModel" ,
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function(JSONModel,Filter,FilterOperator) {
	"use strict";

	return {        

        handleFormValueHelp: async function (oEvent, oThis) {
            var me = oThis;
            var oSource = oEvent.getSource();
            me._inputSource = oSource;
            me._inputId = oSource.getId();
            me._inputValue = oSource.getValue();
            let input = oSource.getBindingInfo("value").parts[0].path.split("/");
            me._inputField = input[input.length-1].toUpperCase(); //slice and uppercase
            var sModel = oSource.getBindingInfo("value").parts[0].model;
            var sTitle = oSource.getProperty("name") === undefined || oSource.getProperty("name") === "" ? me._inputField : oSource.getProperty("name");
            var oTableSource = oSource.oParent.oParent;
            // var sTabId = oTableSource.sId.split("--")[oTableSource.sId.split("--").length - 1];
            var oModel = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            var vColProp = me._oModelColumns[sModel].filter(item => item.ColumnName === me._inputField);
            var sPath = vColProp[0].ValueHelp.items.path;
            var sKey = me._inputField, sValue = me._inputField;
            var sTextFormatMode = vColProp[0].TextFormatMode === undefined || vColProp[0].TextFormatMode === "" ? "Key" : vColProp[0].TextFormatMode;
            var sColumns = vColProp[0].ValueHelp.columns;
            var vhColumns = me._oModelColumns[sColumns];
            var vh = me.getView().getModel(sPath).getData();            
            var aColumns = [], oDDTextParam = [];
            var oDDText = me.getView().getModel("ddtext").getData();
            if (vhColumns !== undefined) {
                vhColumns.forEach(item => {
                    if (item.Key) sKey = item.ColumnName;
                    if (item.Value) sValue = item.ColumnName;
                })
            }

            vh.forEach(item => {
                item.VHKey = item[sKey];
                item.VHValue = sValue === undefined || sKey === sValue ? "" : item[sValue];

                if (sTextFormatMode === "Key") {
                    item.VHSelected = me._inputValue === item[sKey];
                }
                else if (sTextFormatMode === "Value") {
                    item.VHSelected = me._inputValue === item[sValue];
                }
                else if (sTextFormatMode === "KeyValue") {
                    item.VHSelected = me._inputValue === (item[sKey] + " (" + item[sValue] + ")");
                }
                else if (sTextFormatMode === "ValueKey") {
                    item.VHSelected = me._inputValue === (item[sValue] + " (" + item[sKey] + ")");
                }
            })

            vh.sort((a, b) => (a.VHKey > b.VHKey ? 1 : -1));

            if (vh.length > 0) {
                Object.keys(vh[0]).filter(fItem => fItem !== "__metadata" && fItem !== "VHKey" && fItem !== "VHValue" && fItem !== "VHSelected").forEach(item => {
                    if (vhColumns !== undefined) {
                        var oColProp = vhColumns.filter(fItem => fItem.ColumnName === item);

                        if (oColProp && oColProp.length > 0) {
                            if (oColProp[0].Visible) {
                                aColumns.push({
                                    ColumnName: oColProp[0].ColumnName,
                                    ColumnLabel: oColProp[0].ColumnName,
                                    Width: vhColumns.length === 1 ? "340px" : oColProp[0].ColumnWidth,
                                    DataType: oColProp[0].DataType,
                                    Visible: oColProp[0].Visible
                                })
                            } 
                        }
                        else {
                            aColumns.push({
                                ColumnName: item,
                                ColumnLabel: item
                            })
                        }
                    }
                    else {
                        aColumns.push({
                            ColumnName: item,
                            ColumnLabel: item
                        })
                    }                                              
                })
            }
            else {
                if (vhColumns !== undefined) {
                    vhColumns.forEach(item => {
                        if (item.Visible) {
                            aColumns.push({
                                ColumnName: item.ColumnName,
                                ColumnLabel: item.ColumnName,
                                Width: item.ColumnWidth,
                                DataType: item.DataType,
                                Visible: item.Visible
                            })
                        }
                    })
                }
                else  {
                    aColumns.push({
                        ColumnName: sKey,
                        ColumnLabel: sKey
                    }) 
                    
                    if (sKey !== sValue) {
                        aColumns.push({
                            ColumnName: sValue,
                            ColumnLabel: sValue
                        }) 
                    }
                } 
            }

            aColumns.forEach(item => {
                if (oDDText[item.ColumnName.toUpperCase()] === undefined || oDDText[item.ColumnName.toUpperCase()] === "") {
                    oDDTextParam.push({CODE: item.ColumnName.toUpperCase()});
                }
            })

            if (oDDText[sTitle.toUpperCase()] === undefined || oDDText[sTitle.toUpperCase()] === "") {
                oDDTextParam.push({CODE: sTitle.toUpperCase()});
            }

            if (oDDText["DESC"] === undefined || oDDText["DESC"] === "") {
                oDDTextParam.push({CODE: "DESC"});
            }

            var oModel = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            var oPromiseResult = new Promise((resolve, reject) => {
                if (oDDTextParam.length > 0) {
                    oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                        method: "POST",
                        success: function(oData, oResponse) {        
                            oData.CaptionMsgItems.results.forEach(item => {
                                oDDText[item.CODE] = item.TEXT;
                            })
    
                            me.getView().setModel(new JSONModel(oDDText), "ddtext");
                            resolve(oDDText);
                        },
                        error: function(oError) { 
                            resolve(oDDText);
                        }
                    });
                }
                else { resolve(oDDText); }
            });

            oDDText = await oPromiseResult;

            aColumns.forEach(item => {
                if (item.ColumnLabel.toUpperCase() === "DESC1" && !(oDDText["DESC1"] === undefined || oDDText["DESC1"] === "")) {
                    item.ColumnLabel = oDDText["DESC"];
                }
                else if (item.ColumnLabel.toUpperCase() === "DESC2" && !(oDDText["DESC2"] === undefined || oDDText["DESC2"] === "")) {
                    item.ColumnLabel = oDDText["DESC"];
                }
                else if (!(oDDText[item.ColumnName.toUpperCase()] === undefined || oDDText[item.ColumnName.toUpperCase()] === "")) {
                    item.ColumnLabel = oDDText[item.ColumnName.toUpperCase()];
                }
                else {
                    item.ColumnLabel = item.ColumnName;
                }
            })                

            var oColumns = { columns: aColumns };
            var oVHModel = new JSONModel({
                title: oDDText[sTitle.toUpperCase()],
                count: vh.length,
                textFormatMode: sTextFormatMode
            });             

            // create value help dialog
            if (!me._tableValueHelpDialog) {
                me._tableValueHelpDialog = sap.ui.xmlfragment(
                    "zuipr.view.fragments.valuehelp.TableValueHelpDialog",
                    me
                );

                me._tableValueHelpDialog.setModel(oVHModel);
                me.getView().addDependent(me._tableValueHelpDialog);
            }
            else {
                me._tableValueHelpDialog.setModel(oVHModel);
            }

            me._tableValueHelpDialog.open();
            var oTable = me._tableValueHelpDialog.getContent()[0].getAggregation("items")[0];
            oTable.attachCellClick(me._tableValueHelp.handleTableValueHelpSelect.bind(me));
            // sap.ui.getCore().byId("tvhSearchField").attachSearch(me._tableValueHelp.handleTableValueHelpFilter); 
            // sap.ui.getCore().byId("btnTVHCancel").attachPress(me._tableValueHelp.handleTableValueHelpCancel.bind(me));
            me._tableValueHelpDialog.getContent()[0].getItems()[0].getExtension()[0].getContent()[3].attachSearch(me._tableValueHelp.handleTableValueHelpFilter);
            me._tableValueHelpDialog.getButtons()[0].attachPress(me._tableValueHelp.handleTableValueHelpCancel.bind(me));

            //bind columns to the table
            oTable.getModel().setProperty("/columns", oColumns.columns);
            oTable.bindColumns("/columns", function (index, context) {
                var sColumnId = context.getObject().ColumnName;
                var sColumnLabel =  context.getObject().ColumnLabel;
                var sColumnWidth = context.getObject().Width;
                var sColumnVisible = context.getObject().Visible;
                var sColumnDataType = context.getObject().DataType;
                var oCtrl; 

                if (sColumnWidth === undefined || sColumnWidth === "0px") {
                    if (oColumns.columns.length === 1) sColumnWidth = "340px";
                    else sColumnWidth = "200px";
                }
                
                sColumnDataType = sColumnDataType !== undefined ? sColumnDataType : "STRING";
                if (sColumnDataType.toUpperCase() === "STRING") {
                    oCtrl = new sap.m.Text({
                        text: "{" + context.getObject().ColumnName + "}",
                        wrapping: false
                    })    
                }
                else {
                    oCtrl = new sap.m.CheckBox({
                        selected: "{" + context.getObject().ColumnName + "}",
                        wrapping: false
                    })    
                }

                return new sap.ui.table.Column({
                    // id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                    label: new sap.m.Text({ text: sColumnLabel }),
                    template: oCtrl,
                    autoResizable: true,
                    width: sColumnWidth,
                    sortProperty: sColumnId,
                    visible: sColumnVisible !== undefined ? sColumnVisible : true
                });                    
            });

            //bind rows to the table
            oTable.getModel().setProperty("/rows", vh);
            oTable.bindRows("/rows");

            if (vh.length > 5) {
                me._tableValueHelpDialog.setContentHeight("505px");
            }
            else {
                me._tableValueHelpDialog.setContentHeight("280px");
            }

            if (oColumns.columns.length === 1) {
                me._tableValueHelpDialog.setContentWidth("375px");
            }
            else if (oColumns.columns.length === 2) {
                me._tableValueHelpDialog.setContentWidth("435px");
            }
            else {
                me._tableValueHelpDialog.setContentWidth("645px");
            }

            // sap.ui.getCore().byId("tvhSearchField").setProperty("value", "");
            me._tableValueHelpDialog.getContent()[0].getItems()[0].getExtension()[0].getContent()[3].setProperty("value", "");
        },

        handleTableValueHelp: async function (oEvent) {
            var me = this;
            var oSource = oEvent.getSource();

            //extra code and not included in this standard code
            await this.onSuggestionItems_VENDOR_PURORG(oEvent);


            this._inputSource = oSource;
            this._inputId = oSource.getId();
            this._inputValue = oSource.getValue();
            this._inputField = oSource.getBindingInfo("value").parts[0].path;

            var oTableSource = oSource.oParent.oParent;
            var sTabId = oTableSource.sId.split("--")[oTableSource.sId.split("--").length - 1];
            // var me = this;
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            var vColProp = this._tblColumns[sTabId].filter(item => item.ColumnName === this._inputField);
            var sPath = vColProp[0].ValueHelp.items.path;
            var sKey = this._inputField, sValue = this._inputField;
            var sTextFormatMode = vColProp[0].TextFormatMode === undefined || vColProp[0].TextFormatMode === "" ? "Key" : vColProp[0].TextFormatMode;
            var sColumns = vColProp[0].ValueHelp.columns;
            var vhColumns = this._oModelColumns[sColumns];
            var vh = this.getView().getModel(sPath).getData();
            var aColumns = [], oDDTextParam = [];
            var oDDText = this.getView().getModel("ddtext").getData();
            
            // await this.onSuggestionItems_VENDOR_PURORG();

            if (vhColumns !== undefined) {
                vhColumns.forEach(item => {
                    if (item.Key) sKey = item.ColumnName;
                    if (item.Value) sValue = item.ColumnName;
                })
            }

            vh.forEach(item => {
                item.VHKey = item[sKey];
                item.VHValue = sValue === undefined || sKey === sValue ? "" : item[sValue];

                if (sTextFormatMode === "Key") {
                    item.VHSelected = this._inputValue === item[sKey];
                }
                else if (sTextFormatMode === "Value") {
                    item.VHSelected = this._inputValue === item[sValue];
                }
                else if (sTextFormatMode === "KeyValue") {
                    item.VHSelected = this._inputValue === (item[sKey] + " (" + item[sValue] + ")");
                }
                else if (sTextFormatMode === "ValueKey") {
                    item.VHSelected = this._inputValue === (item[sValue] + " (" + item[sKey] + ")");
                }
            })

            vh.sort((a, b) => (a.VHKey > b.VHKey ? 1 : -1));                

            if (vh.length > 0) {
                Object.keys(vh[0]).filter(fItem => fItem !== "__metadata" && fItem !== "VHKey" && fItem !== "VHValue" && fItem !== "VHSelected").forEach(item => {
                    if (vhColumns !== undefined) {
                        var oColProp = vhColumns.filter(fItem => fItem.ColumnName === item);

                        if (oColProp && oColProp.length > 0) {
                            if (oColProp[0].Visible) {
                                aColumns.push({
                                    ColumnName: oColProp[0].ColumnName,
                                    ColumnLabel: oColProp[0].ColumnName,
                                    Width: oColProp[0].ColumnWidth,
                                    DataType: oColProp[0].DataType,
                                    Visible: oColProp[0].Visible
                                })
                            } 
                        }
                        else {
                            aColumns.push({
                                ColumnName: item,
                                ColumnLabel: item
                            })
                        }
                    }
                    else {
                        aColumns.push({
                            ColumnName: item,
                            ColumnLabel: item
                        })
                    }                                              
                })
            }
            else {
                if (vhColumns !== undefined) {
                    vhColumns.forEach(item => {
                        if (item.Visible) {
                            aColumns.push({
                                ColumnName: item.ColumnName,
                                ColumnLabel: item.ColumnName,
                                Width: item.ColumnWidth,
                                DataType: item.DataType,
                                Visible: item.Visible
                            })
                        }
                    })
                }
                else  {
                    aColumns.push({
                        ColumnName: sKey,
                        ColumnLabel: sKey
                    }) 
                    
                    if (sKey !== sValue) {
                        aColumns.push({
                            ColumnName: sValue,
                            ColumnLabel: sValue
                        }) 
                    }
                } 
            }

            aColumns.forEach(item => {
                if (oDDText[item.ColumnName] === undefined) {
                    oDDTextParam.push({CODE: item.ColumnName});
                }
            })

            var oPromiseResult = new Promise((resolve, reject) => {
                if (oDDTextParam.length > 0) {
                    oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                        method: "POST",
                        success: function(oData, oResponse) {        
                            oData.CaptionMsgItems.results.forEach(item => {
                                oDDText[item.CODE] = item.TEXT;
                            })
    
                            me.getView().setModel(new JSONModel(oDDText), "ddtext");
                            resolve(oDDText);
                        },
                        error: function(oError) { 
                            resolve(oDDText);
                        }
                    });
                }
                else { resolve(oDDText); }
            });

            oDDText = await oPromiseResult;

            aColumns.forEach(item => {
                if (!(oDDText[item.ColumnName] === undefined || oDDText[item.ColumnName] === "")) {
                    item.ColumnLabel = oDDText[item.ColumnName];
                }
                else {
                    item.ColumnLabel = item.ColumnName;
                }
            })                

            var oColumns = { columns: aColumns };
            var oVHModel = new JSONModel({
                title: vColProp[0].ColumnLabel,
                count: vh.length,
                textFormatMode: sTextFormatMode
            });             

            // create value help dialog
            if (!this._tableValueHelpDialog) {
                this._tableValueHelpDialog = sap.ui.xmlfragment(
                    "zuipr.view.fragments.valuehelp.TableValueHelpDialog",
                    this
                );

                this._tableValueHelpDialog.setModel(oVHModel);
                this.getView().addDependent(this._tableValueHelpDialog);
            }
            else {
                this._tableValueHelpDialog.setModel(oVHModel);
            }

            this._tableValueHelpDialog.open();
            var oTable = this._tableValueHelpDialog.getContent()[0].getAggregation("items")[0];
            oTable.attachCellClick(this._tableValueHelp.handleTableValueHelpSelect.bind(this));
            // sap.ui.getCore().byId("tvhSearchField").attachSearch(this._tableValueHelp.handleTableValueHelpFilter);           
            // sap.ui.getCore().byId("btnTVHCancel").attachPress(me._tableValueHelp.handleTableValueHelpCancel.bind(me));
            this._tableValueHelpDialog.getContent()[0].getItems()[0].getExtension()[0].getContent()[3].attachSearch(this._tableValueHelp.handleTableValueHelpFilter);
            this._tableValueHelpDialog.getButtons()[0].attachPress(this._tableValueHelp.handleTableValueHelpCancel.bind(this));

            //bind columns to the table
            oTable.getModel().setProperty("/columns", oColumns.columns);
            oTable.bindColumns("/columns", function (index, context) {
                var sColumnId = context.getObject().ColumnName;
                var sColumnLabel =  context.getObject().ColumnLabel;
                var sColumnWidth = context.getObject().Width;
                var sColumnVisible = context.getObject().Visible;
                var sColumnDataType = context.getObject().DataType;
                var oCtrl; 

                if (sColumnWidth === undefined || sColumnWidth === "0px") {
                    if (oColumns.columns.length === 1) sColumnWidth = "340px";
                    else sColumnWidth = "200px";
                }
                
                sColumnDataType = sColumnDataType !== undefined ? sColumnDataType : "STRING";
                if (sColumnDataType.toUpperCase() === "STRING") {
                    oCtrl = new sap.m.Text({
                        text: "{" + context.getObject().ColumnName + "}",
                        wrapping: false
                    })    
                }
                else {
                    oCtrl = new sap.m.CheckBox({
                        selected: "{" + context.getObject().ColumnName + "}",
                        wrapping: false
                    })    
                }

                return new sap.ui.table.Column({
                    // id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                    label: new sap.m.Text({ text: sColumnLabel }),
                    template: oCtrl,
                    autoResizable: true,
                    width: sColumnWidth,
                    sortProperty: sColumnId,
                    visible: sColumnVisible !== undefined ? sColumnVisible : true
                });                    
            });

            //bind rows to the table
            oTable.getModel().setProperty("/rows", vh);
            oTable.bindRows("/rows");

            if (vh.length > 5) {
                this._tableValueHelpDialog.setContentHeight("505px");
            }
            else {
                this._tableValueHelpDialog.setContentHeight("260px");
            }

            if (oColumns.columns.length === 1) {
                this._tableValueHelpDialog.setContentWidth("375px");
            }
            else if (oColumns.columns.length === 2) {
                this._tableValueHelpDialog.setContentWidth("435px");
            }
            else {
                this._tableValueHelpDialog.setContentWidth("645px");
            }

            // sap.ui.getCore().byId("tvhSearchField").setProperty("value", "");
            this._tableValueHelpDialog.getContent()[0].getItems()[0].getExtension()[0].getContent()[3].setProperty("value", "");
        },

        handleStaticTableValueHelp: async function (oEvent, oThis) {
            var me = oThis;
            var oSource = oEvent.getSource();
            var oTableSource = oSource.oParent.oParent;

            me._inputSource = oSource;
            me._inputId = oSource.getId();
            me._inputValue = oSource.getValue();
            me._inputField = oSource.getBindingInfo("value").parts[0].path;

            var sTitle = oSource.getProperty("name") === undefined || oSource.getProperty("name") === "" ? me._inputField : oSource.getProperty("name");
            var sTabId = oTableSource.sId.split("--")[oTableSource.sId.split("--").length - 1];

            // var me = this;
            var oModel = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
            var vColProp = me._oModelColumns[sTabId.replace("Tab", "")].filter(item => item.ColumnName.toUpperCase() === me._inputField.toUpperCase());
            var sPath = vColProp[0].ValueHelp.items.path;
            var sKey = me._inputField, sValue = me._inputField;
            var sTextFormatMode = vColProp[0].TextFormatMode === undefined || vColProp[0].TextFormatMode === "" ? "Key" : vColProp[0].TextFormatMode;
            var sColumns = vColProp[0].ValueHelp.columns;
            var vhColumns = me._oModelColumns[sColumns];
            var vh = me.getView().getModel(sPath).getData();
            var aColumns = [], oDDTextParam = [];
            var oDDText = me.getView().getModel("ddtext").getData();

            if (vhColumns !== undefined) {
                vhColumns.forEach(item => {
                    if (item.Key) sKey = item.ColumnName;
                    if (item.Value) sValue = item.ColumnName;
                })
            }

            vh.forEach(item => {
                item.VHKey = item[sKey];
                item.VHValue = sValue === undefined || sKey === sValue ? "" : item[sValue];

                if (sTextFormatMode === "Key") {
                    item.VHSelected = me._inputValue === item[sKey];
                }
                else if (sTextFormatMode === "Value") {
                    item.VHSelected = me._inputValue === item[sValue];
                }
                else if (sTextFormatMode === "KeyValue") {
                    item.VHSelected = me._inputValue === (item[sKey] + " (" + item[sValue] + ")");
                }
                else if (sTextFormatMode === "ValueKey") {
                    item.VHSelected = me._inputValue === (item[sValue] + " (" + item[sKey] + ")");
                }
            })

            vh.sort((a, b) => (a.VHKey > b.VHKey ? 1 : -1));                

            if (vh.length > 0) {
                Object.keys(vh[0]).filter(fItem => fItem !== "__metadata" && fItem !== "VHKey" && fItem !== "VHValue" && fItem !== "VHSelected").forEach(item => {
                    if (vhColumns !== undefined) {
                        var oColProp = vhColumns.filter(fItem => fItem.ColumnName === item);

                        if (oColProp && oColProp.length > 0) {
                            if (oColProp[0].Visible) {
                                aColumns.push({
                                    ColumnName: oColProp[0].ColumnName,
                                    ColumnLabel: oColProp[0].ColumnName,
                                    Width: oColProp[0].ColumnWidth,
                                    DataType: oColProp[0].DataType,
                                    Visible: oColProp[0].Visible
                                })
                            } 
                        }
                        else {
                            aColumns.push({
                                ColumnName: item,
                                ColumnLabel: item
                            })
                        }
                    }
                    else {
                        aColumns.push({
                            ColumnName: item,
                            ColumnLabel: item
                        })
                    }                                              
                })
            }
            else {
                if (vhColumns !== undefined) {
                    vhColumns.forEach(item => {
                        if (item.Visible) {
                            aColumns.push({
                                ColumnName: item.ColumnName,
                                ColumnLabel: item.ColumnName,
                                Width: item.ColumnWidth,
                                DataType: item.DataType,
                                Visible: item.Visible
                            })
                        }
                    })
                }
                else  {
                    aColumns.push({
                        ColumnName: sKey,
                        ColumnLabel: sKey
                    }) 
                    
                    if (sKey !== sValue) {
                        aColumns.push({
                            ColumnName: sValue,
                            ColumnLabel: sValue
                        }) 
                    }
                } 
            }

            aColumns.forEach(item => {
                if (oDDText[item.ColumnName.toUpperCase()] === undefined || oDDText[item.ColumnName.toUpperCase()] === "") {
                    oDDTextParam.push({CODE: item.ColumnName.toUpperCase()});
                }
            })

            if (oDDText[sTitle.toUpperCase()] === undefined || oDDText[sTitle.toUpperCase()] === "") {
                oDDTextParam.push({CODE: sTitle.toUpperCase()});
            }

            if (oDDText["DESC"] === undefined || oDDText["DESC"] === "") {
                oDDTextParam.push({CODE: "DESC"});
            }

            var oPromiseResult = new Promise((resolve, reject) => {
                if (oDDTextParam.length > 0) {
                    oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                        method: "POST",
                        success: function(oData, oResponse) {        
                            oData.CaptionMsgItems.results.forEach(item => {
                                oDDText[item.CODE] = item.TEXT;
                            })
    
                            me.getView().setModel(new JSONModel(oDDText), "ddtext");
                            resolve(oDDText);
                        },
                        error: function(oError) { 
                            resolve(oDDText);
                        }
                    });
                }
                else { resolve(oDDText); }
            });

            oDDText = await oPromiseResult;

            aColumns.forEach(item => {
                if (item.ColumnLabel.toUpperCase() === "DESC1" && !(oDDText["DESC1"] === undefined || oDDText["DESC1"] === "")) {
                    item.ColumnLabel = oDDText["DESC"];
                }
                else if (item.ColumnLabel.toUpperCase() === "DESC2" && !(oDDText["DESC2"] === undefined || oDDText["DESC2"] === "")) {
                    item.ColumnLabel = oDDText["DESC"];
                }
                else if (!(oDDText[item.ColumnName.toUpperCase()] === undefined || oDDText[item.ColumnName.toUpperCase()] === "")) {
                    item.ColumnLabel = oDDText[item.ColumnName.toUpperCase()];
                }
                else {
                    item.ColumnLabel = item.ColumnName;
                }
            })                

            var oColumns = { columns: aColumns };
            var oVHModel = new JSONModel({
                title: oDDText[sTitle.toUpperCase()],
                count: vh.length,
                textFormatMode: sTextFormatMode
            });             

            // create value help dialog
            if (!me._tableValueHelpDialog) {
                me._tableValueHelpDialog = sap.ui.xmlfragment(
                    "zuipr.view.fragments.valuehelp.TableValueHelpDialog",
                    me
                );

                me._tableValueHelpDialog.setModel(oVHModel);
                me.getView().addDependent(me._tableValueHelpDialog);
            }
            else {
                me._tableValueHelpDialog.setModel(oVHModel);
            }

            me._tableValueHelpDialog.open();
            var oTable = me._tableValueHelpDialog.getContent()[0].getAggregation("items")[0];
            oTable.attachCellClick(me._tableValueHelp.handleTableValueHelpSelect.bind(me));
            // sap.ui.getCore().byId("tvhSearchField").attachSearch(me._tableValueHelp.handleTableValueHelpFilter);           
            // sap.ui.getCore().byId("btnTVHCancel").attachPress(me._tableValueHelp.handleTableValueHelpCancel.bind(me));
            me._tableValueHelpDialog.getContent()[0].getItems()[0].getExtension()[0].getContent()[3].attachSearch(me._tableValueHelp.handleTableValueHelpFilter);
            me._tableValueHelpDialog.getButtons()[0].attachPress(me._tableValueHelp.handleTableValueHelpCancel.bind(me));

            //bind columns to the table
            oTable.getModel().setProperty("/columns", oColumns.columns);
            oTable.bindColumns("/columns", function (index, context) {
                var sColumnId = context.getObject().ColumnName;
                var sColumnLabel = context.getObject().ColumnLabel;
                var sColumnWidth = context.getObject().Width;
                var sColumnVisible = context.getObject().Visible;
                var sColumnDataType = context.getObject().DataType;
                var oCtrl; 

                if (sColumnWidth === undefined || sColumnWidth === "0px") {
                    if (oColumns.columns.length === 1) sColumnWidth = "340px";
                    else sColumnWidth = "200px";
                }
                
                sColumnDataType = sColumnDataType !== undefined ? sColumnDataType : "STRING";
                if (sColumnDataType.toUpperCase() === "STRING") {
                    oCtrl = new sap.m.Text({
                        text: "{" + context.getObject().ColumnName + "}",
                        wrapping: false
                    })    
                }
                else {
                    oCtrl = new sap.m.CheckBox({
                        selected: "{" + context.getObject().ColumnName + "}",
                        wrapping: false
                    })    
                }

                return new sap.ui.table.Column({
                    // id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                    label: new sap.m.Text({ text: sColumnLabel }),
                    template: oCtrl,
                    autoResizable: true,
                    width: sColumnWidth,
                    sortProperty: sColumnId,
                    visible: sColumnVisible !== undefined ? sColumnVisible : true
                });                    
            });

            //bind rows to the table
            oTable.getModel().setProperty("/rows", vh);
            oTable.bindRows("/rows");

            if (vh.length > 5) {
                me._tableValueHelpDialog.setContentHeight("500px");
            }
            else {
                me._tableValueHelpDialog.setContentHeight("280px");
            }

            if (oColumns.columns.length === 1) {
                me._tableValueHelpDialog.setContentWidth("375px");
            }
            else if (oColumns.columns.length === 2) {
                me._tableValueHelpDialog.setContentWidth("435px");
            }
            else {
                me._tableValueHelpDialog.setContentWidth("645px");
            }

            // sap.ui.getCore().byId("tvhSearchField").setProperty("value", "");
            me._tableValueHelpDialog.getContent()[0].getItems()[0].getExtension()[0].getContent()[3].setProperty("value", "");
        },
        
        handleTableValueHelpSelect: function (oEvent) {
            var sRowPath = oEvent.getParameters().rowBindingContext.sPath;

            this._inputSource.setSelectedKey(oEvent.getSource().getModel().getProperty(sRowPath + "/VHKey"));
            this._inputSource.setValueState("None");
            this._tableValueHelpDialog.close(); 
        }, 

        handleTableValueHelpCancel: function() {
            this._tableValueHelpDialog.close();
        },

        handleTableValueHelpFilter: function(oEvent) {
            var oTable = oEvent.getSource().oParent.oParent;
            var sQuery = oEvent.getParameter("query");
            var oFilter = null;
            var aFilter = [];

            if (sQuery) {
                oTable.getColumns().forEach(col => {
                    if (col.getAggregation("template").getBindingInfo("text") !== undefined) {
                        aFilter.push(new Filter(col.getAggregation("template").getBindingInfo("text").parts[0].path, FilterOperator.Contains, sQuery));
                    }
                    else if (col.getAggregation("template").getBindingInfo("selected") !== undefined) {
                        aFilter.push(new Filter(col.getAggregation("template").getBindingInfo("selected").parts[0].path, FilterOperator.EQ, sQuery));
                    }
                })

                oFilter = new Filter(aFilter, false);
            }

            oTable.getBinding("rows").filter(oFilter, "Application");
        },

	};
});