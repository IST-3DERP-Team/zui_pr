sap.ui.define([ 
    "sap/ui/model/json/JSONModel" ,
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function(JSONModel,Filter,FilterOperator) {
	"use strict";

	return {        

        updateColumnMenu: function(sTableId, oThis) {
            var _this = this;
            var me = oThis;
            var oTable = me.byId(sTableId);

            for(var x = 0; x < oTable.getColumns().length; x++){
                const col = oTable.getColumns()[x];
                col.attachColumnMenuOpen(function(oEvent) {
                    //Create the Menu Item that need to be added
                    setTimeout(() => {
                        //Get Menu associated with column
                        var oMenu = col.getMenu();     
                        var oMenuItem = new sap.ui.unified.MenuItem({
                            icon: "sap-icon://filter",
                            text: "Filter",
                            select: function(oEvent) {
                                
                                console.log(oEvent.getSource().oParent.oParent.getAggregation("label").getProperty("text"));
                                _this.onColFilter(sTableId, oEvent.getSource().oParent.oParent.getAggregation("label").getProperty("text"), me);
                            }                        
                        })
                        var wCustomFilter = false;

                        for(var z = 0; z < oMenu.getItems().length; z++){
                            var item = oMenu.getItems()[z];
                            
                            if (item.sId.includes("filter")) {
                                // oMenu.removeItem(item);
                                item.setVisible(false)
                            }
                            if (item.mProperties.text !== undefined && item.mProperties.text === "Filter") {
                                wCustomFilter = true;
                            }
                        }
                        
                        if (!wCustomFilter) {
                            oMenu.insertItem(oMenuItem, 3);                               
                        }
                        oMenu.setPageSize(oMenu.getItems().length); 
                    }, 20);
                });
            }     
        },

        onColFilter: function(oEvent, sColumnLabel, oThis) {
            var me = oThis;
            // var oDDText = me.getView().getModel("ddtext").getData();
            var sTableId = "";

            if (typeof(oEvent) === "string") {
                sTableId = oEvent;
            }
            else {
                console.log(sTableId);
                sTableId = oEvent.getSource().data("TableName");
            }

            var sDialogFragmentName = "zuipr.view.fragments.dialog.GenericFilterDialog";

            if (!me._GenericFilterDialog) {
                me._GenericFilterDialog = sap.ui.xmlfragment(sDialogFragmentName, me);
                me._GenericFilterDialog.setModel(new JSONModel());
                me.getView().addDependent(me._GenericFilterDialog);
            }

            var oTable = me.byId(sTableId);
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oFilterValues = oDialog.getModel().getProperty("/values");
            var oFilterCustom = oDialog.getModel().getProperty("/custom");
            var vSelectedItem = sColumnLabel === undefined ? oDialog.getModel().getProperty("/selectedItem") : sColumnLabel;
            var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
            var oSearchValues = {}; 
            var aData = [];
            var oColumnValues = {};
            var bFiltered = false;
            var vFilterType = "VLF";

            var oTableColumns = [];
            var aTableColumns = jQuery.extend(true, [], me._aColumns[sTableId]);
            aTableColumns.forEach((col, idx) => {
                if (!(col.ColumnName === "MANDT" || col.ColumnName === "DOCTYPE" || col.ColumnName === "SHORTTEXT" || col.ColumnName === "INFORECORD" || col.ColumnName === "COMPANY" || col.ColumnName === "PLANMONTH")) {
                    oTableColumns.push(col);
                }
            });

            if (oTable.getModel() !== undefined) { aData = jQuery.extend(true, [], oTable.getModel().getData().rows) } 

            if (me._colFilters[sTableId] !== undefined) {
                aColumnItems = me._colFilters[sTableId].items;
                oFilterValues = me._colFilters[sTableId].values;
                oFilterCustom = me._colFilters[sTableId].custom;
                vSelectedItem = me._colFilters[sTableId].selectedItem;
                vSelectedColumn = me._colFilters[sTableId].selectedColumn;
            }
            else {
                aColumnItems = undefined;
                oFilterValues = undefined;
                oFilterCustom = undefined;
                vSelectedItem = "";
                vSelectedColumn = "";
            }

            if (sColumnLabel !== undefined) { vSelectedItem = sColumnLabel }

            if (oFilterCustom === undefined) { 
                oFilterCustom = {};
            }        

            if (aColumnItems !== undefined) {
                if (aColumnItems.filter(fItem => fItem.isFiltered === true).length > 0) { bFiltered = true; }
            }

            if (!bFiltered) {
                oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
            }
            else {
                oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
            }

            oTableColumns.forEach((col, idx) => {
                if (col.ColumnName === "CREATEDDT" || col.ColumnName === "UPDATEDDT") { col.DataType = "DATETIME" }                   

                oColumnValues[col.ColumnName] = [];

                aData.forEach(val => {
                    if (val[col.ColumnName] === "" || val[col.ColumnName] === null || val[col.ColumnName] === undefined) { val[col.ColumnName] = "(blank)" }
                    else if (val[col.ColumnName] === true) { 
                        val[col.ColumnName] = "Yes";
                    }
                    else if (val[col.ColumnName] === false) { 
                        val[col.ColumnName] = "No";
                    }

                    if (oColumnValues[col.ColumnName].findIndex(item => item.Value === val[col.ColumnName]) < 0) {
                        if (bFiltered && oFilterValues && oFilterValues[col.ColumnName].findIndex(item => item.Value === val[col.ColumnName]) >= 0) {
                            oFilterValues[col.ColumnName].forEach(item => {
                                if (item.Value === val[col.ColumnName]) {
                                    oColumnValues[col.ColumnName].push({
                                        Value: item.Value,
                                        Selected: item.Selected
                                    })
                                }
                            })
                        }
                        else {
                            oColumnValues[col.ColumnName].push({
                                Value: val[col.ColumnName],
                                Selected: true
                            })
                        }
                    }
                }); 

                oColumnValues[col.ColumnName].sort((a,b) => ((col.DataType === "NUMBER" ? +a.Value : (col.DataType === "DATETIME" ? (a.Value === "(blank)" ? "" : new Date(a.Value)) : a.Value)) > (col.DataType === "NUMBER" ? +b.Value : (col.DataType === "DATETIME" ? (b.Value === "(blank)" ? "" : new Date(b.Value)) : b.Value)) ? 1 : -1));

                col.selected = false;                    

                if (!bFiltered) { 
                    if (sColumnLabel === undefined) {
                        if (idx === 0) {
                            vSelectedColumn = col.ColumnName;
                            vSelectedItem = col.ColumnLabel;
                            col.selected = true;
                        }
                    }
                    else {
                        if (vSelectedItem === col.ColumnLabel) { 
                            vSelectedColumn = col.ColumnName;
                            col.selected = true;
                        }
                    }

                    oFilterCustom[col.ColumnName] = {
                        Operator: col.DataType === "STRING" ? "Contains" : "EQ",
                        ValFr: "",
                        ValTo: ""
                    };

                    col.filterType = "VLF";
                    col.isFiltered = false;                        
                }
                else if (bFiltered) {
                    aColumnItems.filter(fItem => fItem.ColumnName === col.ColumnName).forEach(item => {
                        col.filterType = item.filterType;
                        col.isFiltered = item.isFiltered;
                    })

                    if (vSelectedItem === col.ColumnLabel) { 
                        vSelectedColumn = col.ColumnName;
                        vFilterType = col.filterType;
                        col.selected = true;
                        
                        if (col.isFiltered) {
                            oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                        }
                        else {
                            oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                        }
                    }
                }

                col.filterOperator = col.DataType === "STRING" ? "Contains" : "EQ";

                oSearchValues[col.ColumnName] = "";
            })
            console.log(vSelectedColumn);

            oDialog.getModel().setProperty("/sourceTabId", sTableId);
            oDialog.getModel().setProperty("/items", oTableColumns);
            oDialog.getModel().setProperty("/values", oColumnValues);
            oDialog.getModel().setProperty("/currValues", jQuery.extend(true, [], oColumnValues[vSelectedColumn]));
            oDialog.getModel().setProperty("/rowCount", oColumnValues[vSelectedColumn].length);
            oDialog.getModel().setProperty("/selectedItem", vSelectedItem);
            oDialog.getModel().setProperty("/selectedColumn", vSelectedColumn);
            oDialog.getModel().setProperty("/search", oSearchValues);
            oDialog.getModel().setProperty("/reset", false);
            oDialog.getModel().setProperty("/custom", oFilterCustom);
            oDialog.getModel().setProperty("/customColFilterOperator", oFilterCustom[vSelectedColumn].Operator);
            oDialog.getModel().setProperty("/customColFilterFrVal", oFilterCustom[vSelectedColumn].ValFr);
            oDialog.getModel().setProperty("/customColFilterToVal", oFilterCustom[vSelectedColumn].ValTo);
            oDialog.getModel().setProperty("/searchValue", "");
            oDialog.open();

            var bAddSelection = false;
            var iStartSelection = -1, iEndSelection = -1;
            var oTableValues = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[1].getItems()[0];

            oTableValues.clearSelection();
            oColumnValues[vSelectedColumn].forEach((row, idx) => {
                if (row.Selected) { 
                    if (iStartSelection === -1) iStartSelection = idx;
                    iEndSelection = idx;
                }
                
                if (!row.Selected || idx === (oColumnValues[vSelectedColumn].length - 1)) {
                    if (iStartSelection !== -1) { 
                        if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                        else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                        
                        bAddSelection = true;
                        oDialog.getModel().setProperty("/reset", false);
                    } 

                    iStartSelection = -1;
                    iEndSelection = -1;
                }
            })

            oDialog.getModel().setProperty("/reset", true);

            var oBtnClear;
            oDialog.getAggregation("buttons").forEach(item => {
                item.getAggregation("customData").forEach(data => {
                    if (data.getProperty("value") === "Clear") { oBtnClear = item; }
                })
            })

            if (bFiltered) { oBtnClear.setEnabled(true); }
            else { oBtnClear.setEnabled(false); }

            oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().forEach(item => {
                if (oTableColumns.filter(fItem => fItem.ColumnLabel === item.getTitle())[0].isFiltered) { item.setIcon("sap-icon://filter") }
                else { item.setIcon("sap-icon://text-align-justified") }
            });

            if (vFilterType === "UDF") {
                oDialog.getModel().setProperty("/selectUDF", true);
                oDialog.getModel().setProperty("/panelVLFVisible", false);
                oDialog.getModel().setProperty("/panelUDFVisible", true);
            }
            else {
                oDialog.getModel().setProperty("/selectVLF", true);
                oDialog.getModel().setProperty("/panelVLFVisible", true);
                oDialog.getModel().setProperty("/panelUDFVisible", false);
            }

            var vDataType = oTableColumns.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].DataType;
            
            if (vDataType === "BOOLEAN") {
                oDialog.getModel().setProperty("/rbtnUDFVisible", false);
                oDialog.getModel().setProperty("/lblUDFVisible", false);
            }
            else {
                oDialog.getModel().setProperty("/rbtnUDFVisible", true);
                oDialog.getModel().setProperty("/lblUDFVisible", true);
            }

            if (vDataType === "NUMBER") {
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].setType("Number");
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[1].setType("Number");
            }
            else {
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].setType("Text");
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[1].setType("Text");
            }

            if (oFilterCustom[vSelectedColumn].Operator === "BT") {
                oDialog.getModel().setProperty("/panelUDFToVisible", true);
            }
            else {
                oDialog.getModel().setProperty("/panelUDFToVisible", false);
            }

            if (vDataType === "DATETIME") {
                oDialog.getModel().setProperty("/customColFilterFrValVisible", false);
                oDialog.getModel().setProperty("/customColFilterToValVisible", false);
                oDialog.getModel().setProperty("/customColFilterFrDateVisible", true);
                oDialog.getModel().setProperty("/customColFilterToDateVisible", true);
            }
            else{
                oDialog.getModel().setProperty("/customColFilterFrValVisible", true);
                oDialog.getModel().setProperty("/customColFilterToValVisible", true);
                oDialog.getModel().setProperty("/customColFilterFrDateVisible", false);
                oDialog.getModel().setProperty("/customColFilterToDateVisible", false);
            }

            if (vDataType !== "STRING") {
                if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getItems().filter(item => item.getKey() === "Contains").length > 0) {
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].removeItem(3);
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].removeItem(2);
                }
            }
            else {
                if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getItems().filter(item => item.getKey() === "Contains").length === 0) {
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].insertItem(
                        new sap.ui.core.Item({
                            key: "Contains", 
                            text: "Contains"
                        }), 2
                    );

                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].insertItem(
                        new sap.ui.core.Item({
                            key: "NotContains", 
                            text: "Not Contains"
                        }), 3
                    );
                }
            }

            var oDelegateClick = {
                onclick: function (oEvent) {
                    if (oEvent.srcControl.data("FilterType") === "UDF") {
                        oDialog.getModel().setProperty("/panelVLFVisible", false);
                        oDialog.getModel().setProperty("/panelUDFVisible", true);
                    }
                    else {
                        oDialog.getModel().setProperty("/panelVLFVisible", true);
                        oDialog.getModel().setProperty("/panelUDFVisible", false);
                    }
                }
            };

            oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[0].getItems()[0].getContent()[3].addEventDelegate(oDelegateClick);
            oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[0].getItems()[0].getContent()[6].addEventDelegate(oDelegateClick);

            me._GenericFilterDialogModel = jQuery.extend(true, [], oDialog.getModel());
            me._colFilters[sTableId] = jQuery.extend(true, {}, oDialog.getModel().getData());
        },

        onColFilterClear: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var sSourceTabId = oDialog.getModel().getData().sourceTabId;
            oDialog.close();

            var oFilter = "";

            aColumnItems.forEach(item => {
                oColumnValues[item.ColumnName].forEach(val => val.Selected = true)
                item.isFiltered = false;
            })

            me.byId(sSourceTabId).getBinding("rows").filter(oFilter, "Application");           
            oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().forEach(item => item.setIcon("sap-icon://text-align-justified"));

            me.byId(sSourceTabId).getColumns().forEach(col => {                   
                col.setProperty("filtered", false);
            })

            me._colFilters[sSourceTabId] = jQuery.extend(true, {}, oDialog.getModel().getData());
            // me.setActiveRowHighlightByTableId(sSourceTabId);

            //additonal code
            if (sSourceTabId === "salDocDynTable") {
                var vActiveRec = me.byId(sSourceTabId).getModel().getData().rows.filter((item,index) => index === 0)[0].DLVNO;

                // if (me.getView().getModel("ui").getProperty("/activeDlv") !== vActiveRec) {
                //     me.byId(sSourceTabId).getModel().getData().rows.forEach(item => {
                //         if (item.DLVNO === vActiveRec) { item.ACTIVE = "X"; }
                //         else { item.ACTIVE = ""; }
                //     });

                //     // me.setActiveRowHighlightByTableId(sSourceTabId);
                //     me.getView().getModel("ui").setProperty("/activeDlv", vActiveRec);
                //     me.getDetailData(false);
                // }

                me.getView().getModel("ui").setProperty("/saldocCount", me.byId(sSourceTabId).getBinding("rows").aIndices.length);
            }
            // else if (sSourceTabId === "mainDetailTab") {
            //     me.getView().getModel("counts").setProperty("/detail", me.byId(sSourceTabId).getBinding("rows").aIndices.length);
            // }
        },

        onColFilterCancel: function(oEvent, oThis) {
            var me = oThis;
            var oDialogModel = me._GenericFilterDialogModel;
            var oDialog = me._GenericFilterDialog;
            oDialog.getModel().setProperty("/items", oDialogModel.getData().items);
            oDialog.getModel().setProperty("/values", oDialogModel.getData().values);
            oDialog.getModel().setProperty("/currValues", oDialogModel.getData().currValues);
            oDialog.getModel().setProperty("/search", oDialogModel.getData().search);
            oDialog.getModel().setProperty("/custom", oDialogModel.getData().custom);

            oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().forEach(item => {
                var isFiltered = oDialogModel.getData().items.filter(fItem => fItem.ColumnLabel === item.getTitle())[0].isFiltered;
                
                if (isFiltered) {
                    item.setIcon("sap-icon://filter");
                }
                else {
                    item.setIcon("sap-icon://text-align-justified");
                }
            });

            me._GenericFilterDialog.close();
        },

        onColFilterConfirm: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var oFilterCustom = oDialog.getModel().getProperty("/custom");
            var sSourceTabId = oDialog.getModel().getData().sourceTabId;
            oDialog.close();

            var aFilter = [];
            var oFilter = null;
            var oSourceTableColumns = me.byId(sSourceTabId).getColumns();
            
            aColumnItems.forEach(item => {
                var oColumn = oSourceTableColumns.filter(fItem => fItem.getAggregation("label").getProperty("text") === item.ColumnLabel)[0];                    
                var aColFilter = [];
                var oColFilter = null;

                if (item.filterType === "VLF" && oColumnValues[item.ColumnName].filter(fItem => fItem.Selected === false).length > 0) {
                    oColumnValues[item.ColumnName].forEach(val => {
                        if (val.Selected) {
                            if (val.Value === "(blank)") {
                                aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), ""));
                                aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), null));
                                aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), undefined));
                            }
                            else if (item.DataType === "BOOLEAN") {
                                if (val.Value === "Yes") {
                                    aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), true))
                                }
                                else {
                                    aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), false))
                                }
                            }
                            else {
                                aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), val.Value))
                            }
                        }
                    })

                    oColFilter = new Filter(aColFilter, false);
                    aFilter.push(new Filter(oColFilter));

                    oColumn.setProperty("filtered", true);
                    item.isFiltered = true;
                }
                else if (item.filterType === "UDF" && oFilterCustom[item.ColumnName].ValFr !== "") {
                    if (oFilterCustom[item.ColumnName].ValTo !== "") {
                        aFilter.push(new Filter(item.ColumnName, this.getConnector("BT"), oFilterCustom[item.ColumnName].ValFr, oFilterCustom[item.ColumnName].ValTo));
                    }
                    else {
                        aFilter.push(new Filter(item.ColumnName, this.getConnector(oFilterCustom[item.ColumnName].Operator), oFilterCustom[item.ColumnName].ValFr));
                    }

                    oColumn.setProperty("filtered", true);
                    item.isFiltered = true;
                }
                else {
                    oColumn.setProperty("filtered", false);
                    item.isFiltered = false;
                }
            })
            
            if (aFilter.length > 0) {
                oFilter = new Filter(aFilter, true);
            }
            else {
                oFilter = "";
            }

            // console.log(oFilter)
            me.byId(sSourceTabId).getBinding("rows").filter(oFilter, "Application");
            me._colFilters[sSourceTabId] = jQuery.extend(true, {}, oDialog.getModel().getData());
            
            //additonal code
            if (oFilter !== "") {
                if (sSourceTabId === "styleDynTable") {
                    if (me.byId(sSourceTabId).getBinding("rows").aIndices.length === 0) {
                        me.getView().getModel("ui").setProperty("/prno", '');
                        me.getView().getModel("ui").setProperty("/pritem", '');
                        me.getView().getModel("counts").setProperty("/total", 0);

                        // me.byId("detailTab").setModel(new JSONModel({
                        //     rows: []
                        // }));
                    }
                    else {
                        // var vActiveRec = me.byId(sSourceTabId).getModel().getData().rows.filter((item,index) => index === me.byId(sSourceTabId).getBinding("rows").aIndices[0])[0].DLVNO;

                        // if (me.getView().getModel("ui").getProperty("/activeSaldocNo") !== vActiveRec) {
                        //     me.byId(sSourceTabId).getModel().getData().rows.forEach(item => {
                        //         if (item.SALESDOCNO === vActiveRec) { item.ACTIVE = "X"; }
                        //         else { item.ACTIVE = ""; }
                        //     });

                        //     me.setActiveRowHighlightByTableId(sSourceTabId);
                        //     me.getView().getModel("ui").setProperty("/activeDlv", vActiveRec);
                        //     // me.getDetailData(false);
                        // }

                        me.getView().getModel("counts").setProperty("/total", me.byId(sSourceTabId).getBinding("rows").aIndices.length);
                    }
                }
                // else if (sSourceTabId === "mainDetailTab") {
                //     if (me.byId(sSourceTabId).getBinding("rows").aIndices.length === 0) {
                //         me.getView().getModel("counts").setProperty("/detail", 0);
                //     }
                //     else {
                //         me.getView().getModel("counts").setProperty("/detail", me.byId(sSourceTabId).getBinding("rows").aIndices.length);
                //         me.setActiveRowHighlightByTableId(sSourceTabId);
                //     }
                // }
            }
            else {
                console.log(me.byId(sSourceTabId).getModel().getData().rows.length);
                me.getView().getModel("counts").setProperty("/total", me.byId(sSourceTabId).getModel().getData().rows.length);
            }
        },

        onFilterItemPress: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var oFilterCustom = oDialog.getModel().getProperty("/custom");
            var vSelectedItem = oEvent.getSource().getSelectedItem().getProperty("title");
            var vSelectedColumn = "";

            aColumnItems.forEach(item => {
                if (item.ColumnLabel === vSelectedItem) { 
                    vSelectedColumn = item.ColumnName; 
                    
                    if (item.isFiltered) {
                        oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                    }
                    else {
                        oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                    }
                }
            })

            oDialog.getModel().setProperty("/currValues", jQuery.extend(true, [], oColumnValues[vSelectedColumn]));
            oDialog.getModel().setProperty("/rowCount", oColumnValues[vSelectedColumn].length);
            oDialog.getModel().setProperty("/selectedItem", vSelectedItem);
            oDialog.getModel().setProperty("/selectedColumn", vSelectedColumn);
            oDialog.getModel().setProperty("/reset", false);
            oDialog.getModel().setProperty("/customColFilterOperator", oFilterCustom[vSelectedColumn].Operator);
            oDialog.getModel().setProperty("/customColFilterFrVal", oFilterCustom[vSelectedColumn].ValFr);
            oDialog.getModel().setProperty("/customColFilterToVal", oFilterCustom[vSelectedColumn].ValTo);
            oDialog.getModel().setProperty("/searchValue", "");

            var bAddSelection = false;
            var iStartSelection = -1, iEndSelection = -1;
            var oTableValues = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[1].getItems()[0];
            oTableValues.clearSelection();
            oColumnValues[vSelectedColumn].forEach((row, idx) => {
                if (row.Selected) { 
                    if (iStartSelection === -1) iStartSelection = idx;
                    iEndSelection = idx;
                }
                
                if (!row.Selected || idx === (oColumnValues[vSelectedColumn].length - 1)) {
                    if (iStartSelection !== -1) { 
                        if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                        else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                        
                        bAddSelection = true;
                        oDialog.getModel().setProperty("/reset", false);
                    } 

                    iStartSelection = -1;
                    iEndSelection = -1;
                }
            })

            var vFilterType = aColumnItems.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].filterType;
            var vDataType = aColumnItems.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].DataType;

            if (vFilterType === "UDF") {
                oDialog.getModel().setProperty("/selectVLF", false);
                oDialog.getModel().setProperty("/selectUDF", true);
                oDialog.getModel().setProperty("/panelVLFVisible", false);
                oDialog.getModel().setProperty("/panelUDFVisible", true);
            }
            else {
                oDialog.getModel().setProperty("/selectUDF", false);
                oDialog.getModel().setProperty("/selectVLF", true);
                oDialog.getModel().setProperty("/panelVLFVisible", true);
                oDialog.getModel().setProperty("/panelUDFVisible", false);
            }

            if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getSelectedKey() === "BT") {
                oDialog.getModel().setProperty("/panelUDFToVisible", true);
            }
            else {
                oDialog.getModel().setProperty("/panelUDFToVisible", false);
            }

            if (vDataType === "BOOLEAN") {
                oDialog.getModel().setProperty("/rbtnUDFVisible", false);
                oDialog.getModel().setProperty("/lblUDFVisible", false);
            }
            else {
                oDialog.getModel().setProperty("/rbtnUDFVisible", true);
                oDialog.getModel().setProperty("/lblUDFVisible", true);
            }

            if (vDataType === "NUMBER") {
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].setType("Number");
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[1].setType("Number");
            }
            else {
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].setType("Text");
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[1].setType("Text");
            }

            if (vDataType === "DATETIME") {
                oDialog.getModel().setProperty("/customColFilterFrValVisible", false);
                oDialog.getModel().setProperty("/customColFilterToValVisible", false);
                oDialog.getModel().setProperty("/customColFilterFrDateVisible", true);
                oDialog.getModel().setProperty("/customColFilterToDateVisible", true);
            }
            else {
                oDialog.getModel().setProperty("/customColFilterFrValVisible", true);
                oDialog.getModel().setProperty("/customColFilterToValVisible", true);
                oDialog.getModel().setProperty("/customColFilterFrDateVisible", false);
                oDialog.getModel().setProperty("/customColFilterToDateVisible", false);
            }

            if (vDataType !== "STRING") {
                if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getItems().filter(item => item.getKey() === "Contains").length > 0) {
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].removeItem(3);
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].removeItem(2);
                }
            }
            else {
                if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getItems().filter(item => item.getKey() === "Contains").length === 0) {
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].insertItem(
                        new sap.ui.core.Item({
                            key: "Contains", 
                            text: "Contains"
                        }), 2
                    );

                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].insertItem(
                        new sap.ui.core.Item({
                            key: "NotContains", 
                            text: "Not Contains"
                        }), 3
                    );
                }
            }

            oDialog.getModel().setProperty("/reset", true);
        },

        onFilterValuesSelectionChange: function(oEvent, oThis) { 
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            
            if (oDialog.getModel().getProperty("/reset")) {
                var aColumnItems = oDialog.getModel().getProperty("/items");
                var oColumnValues = oDialog.getModel().getProperty("/values");
                var oCurrColumnValues = oDialog.getModel().getProperty("/currValues");
                var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
                var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");
                var oTableValues = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[1].getItems()[0];
                var bFiltered = false;
                
                oCurrColumnValues.forEach((item, idx) => {
                    if (oTableValues.isIndexSelected(idx)) { 
                        item.Selected = true;
                        oColumnValues[vSelectedColumn].filter(fItem => fItem.Value === item.Value).forEach(val => val.Selected = true);
                    }
                    else { 
                        bFiltered = true;
                        item.Selected = false;
                        oColumnValues[vSelectedColumn].filter(fItem => fItem.Value === item.Value).forEach(val => val.Selected = false);
                    }
                })

                if (bFiltered) { 
                    oDialog.getModel().setProperty("/selectVLF", true);
                    oDialog.getModel().setProperty("/panelVLFVisible", true);
                    oDialog.getModel().setProperty("/panelUDFVisible", false);
                    aColumnItems.forEach(item => {
                        if (item.ColumnName === vSelectedColumn) {
                            item.filterType = "VLF";
                            item.isFiltered = true;
                        }
                    })
                }
                else {
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                }

                var vFilterType = aColumnItems.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].filterType;
                var oItem = oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().filter(fItem => fItem.getTitle() === vSelectedItem)[0];

                if (vFilterType === "VLF") {
                    if (bFiltered) {
                        oItem.setIcon("sap-icon://filter");
                        oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                    }
                    else {
                        oItem.setIcon("sap-icon://text-align-justified");
                        oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                    }
                }
            }
        },

        onSearchFilterValue: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;   
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var oCurrColumnValues = []; //oDialog.getModel().getProperty("/currValues");
            var oSearchValues = oDialog.getModel().getProperty("/search");
            var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
            var oTableValues = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[1].getItems()[0];
            var sQuery = "";
            var bAddSelection = false;
            var iStartSelection = -1, iEndSelection = -1;

            if (typeof(oEvent) === "string") {
                sQuery = oEvent;
            }
            else {
                sQuery = oEvent.getParameter("query");
            }

            if (sQuery) {
                oColumnValues[vSelectedColumn].forEach(val => {
                    if (val.Value.toLocaleLowerCase().indexOf(sQuery.toLocaleLowerCase()) >= 0) {
                        oCurrColumnValues.push(val);
                    }
                })
            }
            else {
                oCurrColumnValues = oColumnValues[vSelectedColumn];
            }

            oSearchValues[vSelectedColumn] = sQuery;
            oDialog.getModel().setProperty("/search", oSearchValues);
            oDialog.getModel().setProperty("/currValues", oCurrColumnValues);
            oDialog.getModel().setProperty("/rowCount", oCurrColumnValues.length);
            oDialog.getModel().setProperty("/reset", false);

            var oCopyCurrColumnValues = jQuery.extend(true, [], oCurrColumnValues)
            oTableValues.clearSelection();

            oCopyCurrColumnValues.forEach((row, idx) => {
                if (row.Selected) { 
                    if (iStartSelection === -1) iStartSelection = idx;
                    iEndSelection = idx;
                }
                
                if (!row.Selected || idx === (oCopyCurrColumnValues.length - 1)) {
                    if (iStartSelection !== -1) { 
                        if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                        else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                        
                        bAddSelection = true;
                        oDialog.getModel().setProperty("/reset", false);
                    } 

                    iStartSelection = -1;
                    iEndSelection = -1;
                }
            })

            oDialog.getModel().setProperty("/reset", true);
        },

        onCustomColFilterChange: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;

            if (!(oEvent.getSource().getSelectedKey() === undefined || oEvent.getSource().getSelectedKey() === "")) {
                if (oEvent.getSource().getSelectedKey() === "BT") {
                    oDialog.getModel().setProperty("/panelUDFToVisible", true);
                }
                else {
                    oDialog.getModel().setProperty("/panelUDFToVisible", false);
                }
            }

            var aColumnItems = oDialog.getModel().getProperty("/items");
            var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
            var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");
            var oFilterCustom = oDialog.getModel().getProperty("/custom");
            var sOperator = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getSelectedKey();
            var vDataType = aColumnItems.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].DataType;
            var sValueFr = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].getValue();
            var sValueTo = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[1].getValue();

            if (vDataType === "DATETIME") {
                sValueFr = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[2].getValue();
                sValueTo = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[2].getValue();
            }

            oFilterCustom[vSelectedColumn].Operator = sOperator;
            oFilterCustom[vSelectedColumn].ValFr = sValueFr;
            oFilterCustom[vSelectedColumn].ValTo = sValueTo;
            oDialog.getModel().setProperty("/custom", oFilterCustom);

            if (sValueFr !== "") { 
                oDialog.getModel().setProperty("/selectUDF", true);
                oDialog.getModel().setProperty("/panelVLFVisible", false);
                oDialog.getModel().setProperty("/panelUDFVisible", true);
                aColumnItems.forEach(item => {
                    if (item.ColumnName === vSelectedColumn) {
                        item.filterType = "UDF";
                        item.isFiltered = true;
                    }
                })                    
            }

            var vFilterType = aColumnItems.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].filterType;
            var oItem = oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().filter(fItem => fItem.getTitle() === vSelectedItem)[0];

            if (vFilterType === "UDF") {
                if (sValueFr !== "") {
                    oItem.setIcon("sap-icon://filter");
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                }
                else {
                    oItem.setIcon("sap-icon://text-align-justified");
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                }
            }                
        },

        onSetUseColFilter: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
            var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");

            aColumnItems.forEach(item => {
                if (item.ColumnName === vSelectedColumn && oEvent.getParameter("selected")) {
                    item.filterType = oEvent.getSource().data("FilterType");
                }
            })

            var oItem = oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().filter(fItem => fItem.getTitle() === vSelectedItem)[0];
            
            if (oEvent.getSource().data("FilterType") === "UDF") {
                oDialog.getModel().setProperty("/panelVLFVisible", false);
                oDialog.getModel().setProperty("/panelUDFVisible", true);

                if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].getValue() !== "" && oEvent.getParameter("selected")) {
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                    oItem.setIcon("sap-icon://filter");
                }
                else {
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                    oItem.setIcon("sap-icon://text-align-justified");
                }
            }
            else {
                oDialog.getModel().setProperty("/panelVLFVisible", true);
                oDialog.getModel().setProperty("/panelUDFVisible", false);

                if (oColumnValues[vSelectedColumn].filter(fItem => fItem.Selected === false).length > 0 && oEvent.getParameter("selected")) {
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                    oItem.setIcon("sap-icon://filter");
                }
                else {
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                    oItem.setIcon("sap-icon://text-align-justified");
                }
            }
        },

        onRemoveColFilter: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var oFilterCustom = oDialog.getModel().getProperty("/custom");
            var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
            var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");

            aColumnItems.forEach(item => {
                if (item.ColumnName === vSelectedColumn) {
                    item.isFiltered = false;
                }
            })

            oFilterCustom[vSelectedColumn].ValFr = "";
            oFilterCustom[vSelectedColumn].ValTo = "";
            oDialog.getModel().setProperty("/custom", oFilterCustom);
            oDialog.getModel().setProperty("/customColFilterFrVal", "");
            oDialog.getModel().setProperty("/customColFilterToVal", "");
            
            oColumnValues[vSelectedColumn].forEach(item => item.Selected = true);

            var bAddSelection = false;
            var iStartSelection = -1, iEndSelection = -1;
            var oTableValues = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[1].getItems()[0];

            oDialog.getModel().setProperty("/reset", false);
            oTableValues.clearSelection();
            oColumnValues[vSelectedColumn].forEach((row, idx) => {
                if (row.Selected) { 
                    if (iStartSelection === -1) iStartSelection = idx;
                    iEndSelection = idx;
                }
                
                if (!row.Selected || idx === (oColumnValues[vSelectedColumn].length - 1)) {
                    if (iStartSelection !== -1) { 
                        if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                        else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                        
                        bAddSelection = true;
                        oDialog.getModel().setProperty("/reset", false);
                    } 

                    iStartSelection = -1;
                    iEndSelection = -1;
                }
            })

            oDialog.getModel().setProperty("/reset", true);
            oDialog.getModel().setProperty("/values", oColumnValues);
            oDialog.getModel().setProperty("/currValues", oColumnValues[vSelectedColumn]);

            oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().forEach(item => {
                if (item.getTitle() === vSelectedItem) {
                    item.setIcon("sap-icon://text-align-justified")
                }
            });

            oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
        },

        getConnector(args) {
            var oConnector;

            switch (args) {
                case "EQ":
                    oConnector = sap.ui.model.FilterOperator.EQ
                    break;
                case "NE":
                    oConnector = sap.ui.model.FilterOperator.NE
                    break;
                case "GT":
                    oConnector = sap.ui.model.FilterOperator.GT
                    break;
                case "GE":
                    oConnector = sap.ui.model.FilterOperator.GE
                    break; 
                case "LT":
                    oConnector = sap.ui.model.FilterOperator.LT
                    break;
                case "LE":
                    oConnector = sap.ui.model.FilterOperator.LE
                    break;
                case "BT":
                    oConnector = sap.ui.model.FilterOperator.BT
                    break;
                case "Contains":
                    oConnector = sap.ui.model.FilterOperator.Contains
                    break;
                case "NotContains":
                    oConnector = sap.ui.model.FilterOperator.NotContains
                    break;
                case "StartsWith":
                    oConnector = sap.ui.model.FilterOperator.StartsWith
                    break;
                case "NotStartsWith":
                    oConnector = sap.ui.model.FilterOperator.NotStartsWith
                    break;
                case "EndsWith":
                    oConnector = sap.ui.model.FilterOperator.EndsWith
                    break;
                case "NotEndsWith":
                    oConnector = sap.ui.model.FilterOperator.NotEndsWith
                    break;
                default:
                    oConnector = sap.ui.model.FilterOperator.Contains
                    break;
            }

            return oConnector;
        },

        applyColFilters: function(sTableId, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            
            if (me._colFilters[sTableId] !== undefined) {
                if (oDialog) {
                    var aColumnItems = me._colFilters[sTableId].items;
                    var oColumnValues = me._colFilters[sTableId].values;
                    var oFilterCustom = me._colFilters[sTableId].custom;
                    // var sSourceTabId = oDialog.getModel().getData().sourceTabId;
    
                    var aFilter = [];
                    var oFilter = null;
                    var oSourceTableColumns = me.byId(sTableId).getColumns();

                    aColumnItems.forEach(item => {
                        var oColumn = oSourceTableColumns.filter(fItem => fItem.getAggregation("label").getProperty("text") === item.ColumnLabel)[0];                    
                        var aColFilter = [];
                        var oColFilter = null;
        
                        if (item.filterType === "VLF" && oColumnValues[item.ColumnName].filter(fItem => fItem.Selected === false).length > 0) {
                            oColumnValues[item.ColumnName].forEach(val => {
                                if (val.Selected) {
                                    if (val.Value === "(blank)") {
                                        aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), ""));
                                        aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), null));
                                        aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), undefined));
                                    }
                                    else if (item.DataType === "BOOLEAN") {
                                        if (val.Value === "Yes") {
                                            aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), true))
                                        }
                                        else {
                                            aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), false))
                                        }
                                    }
                                    else {
                                        aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), val.Value))
                                    }
                                }
                            })
        
                            oColFilter = new Filter(aColFilter, false);
                            aFilter.push(new Filter(oColFilter));
        
                            oColumn.setProperty("filtered", true);
                            item.isFiltered = true;
                        }
                        else if (item.filterType === "UDF" && oFilterCustom[item.ColumnName].ValFr !== "") {
                            if (oFilterCustom[item.ColumnName].ValTo !== "") {
                                aFilter.push(new Filter(item.ColumnName, this.getConnector("BT"), oFilterCustom[item.ColumnName].ValFr, oFilterCustom[item.ColumnName].ValTo));
                            }
                            else {
                                aFilter.push(new Filter(item.ColumnName, this.getConnector(oFilterCustom[item.ColumnName].Operator), oFilterCustom[item.ColumnName].ValFr));
                            }
        
                            oColumn.setProperty("filtered", true);
                            item.isFiltered = true;
                        }
                        else {
                            oColumn.setProperty("filtered", false);
                            item.isFiltered = false;
                        }
                    })
                    
                    if (aFilter.length > 0) {
                        oFilter = new Filter(aFilter, true);
                    }
                    else {
                        oFilter = "";
                    }
        
                    me.byId(sTableId).getBinding("rows").filter(oFilter, "Application");
                    // me._colFilters[sTableId] = jQuery.extend(true, {}, oDialog.getModel().getData());

                    //additonal code
                    if (sTableId === "styleDynTable") {
                        if (me.byId(sTableId).getBinding("rows").aIndices.length === 0) {
                            me.getView().getModel("ui").setProperty("/prno", '');
                            me.getView().getModel("ui").setProperty("/pritem", '');
                            me.getView().getModel("counts").setProperty("/total", 0);
                            // me.getView().getModel("ui").setProperty("/activeDlv", '');
                            // me.getView().getModel("counts").setProperty("/header", 0);
                            // me.getView().getModel("counts").setProperty("/detail", 0);
    
                            // me.byId("detailTab").setModel(new JSONModel({
                            //     rows: []
                            // }));
                        }
                        else {
                            // var vActiveRec = me.byId(sTableId).getModel().getData().rows.filter((item,index) => index === me.byId(sTableId).getBinding("rows").aIndices[0])[0].DLVNO;
    
                            // if (me.getView().getModel("ui").getProperty("/activeDlv") !== vActiveRec) {
                            //     me.byId(sTableId).getModel().getData().rows.forEach(item => {
                            //         if (item.DLVNO === vActiveRec) { item.ACTIVE = "X"; }
                            //         else { item.ACTIVE = ""; }
                            //     });
    
                            //     me.setActiveRowHighlightByTableId(sTableId);
                            //     me.getView().getModel("ui").setProperty("/activeDlv", vActiveRec);
                            //     me.getDetailData(false);
                            // }
    
                            me.getView().getModel("counts").setProperty("/total", me.byId(sTableId).getBinding("rows").aIndices.length);
                        }
                    }
                    else {
                        var vCount = "";

                        if (sTableId === "styleDynTable") { vCount = "/total" }
                        // else if (sTableId === "delvSchedTab") { vCount = "/dlvsched" }
                        // else if (sTableId === "delvDtlTab") { vCount = "/dlvdtls" }
                        // else if (sTableId === "delvStatTab") { vCount = "/dlvstat" }

                        if (me.byId(sTableId).getBinding("rows").aIndices.length === 0) {
                            me.getView().getModel("ui").setProperty(vCount, 0);
                        }
                        else {
                            me.getView().getModel("ui").setProperty(vCount, me.byId(sTableId).getBinding("rows").aIndices.length);
                            // me.setActiveRowHighlightByTableId(sTableId);
                        }
                    }
                }
            }
        },

        removeColFilters: function(sTableId, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            
            if (me._colFilters[sTableId] !== undefined) {
                if (oDialog) {
                    var aColumnItems = me._colFilters[sTableId].items;
                    var oColumnValues = me._colFilters[sTableId].values;
                    var oFilter = "";

                    aColumnItems.forEach(item => {
                        oColumnValues[item.ColumnName].forEach(val => val.Selected = true)
                        item.isFiltered = false;
                    })

                    me.byId(sTableId).getBinding("rows").filter(oFilter, "Application");           
                    oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().forEach(item => item.setIcon("sap-icon://text-align-justified"));

                    me.byId(sTableId).getColumns().forEach(col => { 
                        col.setProperty("filtered", false);
                    })
                }
            }
        }
	};
});