sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "../js/Common",
        "zuipr/model/formatter",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/Device",
        "sap/ui/core/routing/HashChanger",
        'sap/ui/model/Sorter',
        "sap/ui/table/library",
        "sap/m/TablePersoController",
        "sap/ui/model/xml/XMLModel",
        "../control/DynamicTable",
    ],
    function(BaseController, JSONModel, MessageBox, Common, formatter, Filter, FilterOperator,Device, HashChanger, XMLModel) {
      "use strict";

      var that;
      var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
      var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
      var _PRNO;
      var _PRITM;
      var _promiseResult;
  
      return BaseController.extend("zuipr.controller.Main", {
        onInit: async function () {
            that = this;
            Common.openLoadingDialog(that);

            
            that.callCaptionsAPI(); //call captions function
            this.validationErrors = []; //store errors in field validations

            //router component - navigate to details
            var oComponent = this.getOwnerComponent();
            this._router = oComponent.getRouter();

            this.setSmartFilterModel();//set SmartFilter Model

            this._Model = this.getOwnerComponent().getModel();
            this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            this._isEdited = false
            this._DiscardChangesDialog = null;
            this._oDataBeforeChange = {}
            this._sbuChange = false;
            this._initLoadTbl = true;
            this._smartFilterBar = this.getView().byId("SmartFilterBar");

            this._oDataOnEditValidate = [];
            this._oLockData = [];
            
            this.getView().setModel(new JSONModel({
                dataMode: 'NODATA',
                sbu: "",
            }), "ui");

            this.getView().setModel(new JSONModel({
                total: 0
            }), "counts");

            this._columnLoadError = false; //Column Load Error Object - Determines/Store the boolean if Column has error.
            this._appAction = "" //global variable of Application Action if Display or Change
            await this.getAppAction(); //Get the Application actions if Display or Change in LTD

            if(this._appAction === "display"){
                this.byId("btnNew").setVisible(false);
                this.byId("btnEdit").setVisible(false);
                this.byId("btnDelete").setVisible(false);
                this.byId("btnClose").setVisible(false);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.byId("btnTabLayout").setVisible(false);
                this.byId("btnView").setVisible(false);
            }


            var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PR_FILTERS_CDS");
            oModel.read("/ZVB_3DERP_SBU_SH", {
                success: function (oData, oResponse) {
                    if (oData.results.length === 1) {
                         that.getView().getModel("ui").setProperty("/sbu", oData.results[0].SBU);
                    }
                    else {
                        Common.closeLoadingDialog(that);
                        that.byId("btnNew").setEnabled(false);
                        that.byId("btnEdit").setEnabled(false);
                        that.byId("btnDelete").setEnabled(false);
                        that.byId("btnClose").setEnabled(false);
                        that.byId("btnSave").setEnabled(false);
                        that.byId("btnCancel").setEnabled(false);
                        that.byId("btnTabLayout").setEnabled(false);
                        that.byId("btnView").setEnabled(false);
                    }
                },
                error: function (err) { }
            });
        },
        getAppAction: async function(){
            if(sap.ushell.Container !==undefined){
                const fullHash = new HashChanger().getHash();
                const urlParsing = await sap.ushell.Container.getServiceAsync("URLParsing");
                const shellHash = urlParsing.parseShellHash(fullHash);
                const sAction = shellHash.action;
                this._appAction = sAction;
            }
        },

        onAssignedFiltersChanged: function(oEvent){
            var oStatusText = this.getView().byId("statusText");
			if (oStatusText && this._smartFilterBar) {
				var sText = this._smartFilterBar.retrieveFiltersWithValuesAsText();

				oStatusText.setText(sText);
			}
        },
        onSBUChange: function(oEvent) {
            this._sbuChange = true;
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();
            this.getView().getModel("ui").setProperty("/sbu", vSBU);
        },
        setSmartFilterModel: function () {
            //Model StyleHeaderFilters is for the smartfilterbar
            var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PR_FILTERS_CDS");
            var oSmartFilter = this.getView().byId("SmartFilterBar");
            oSmartFilter.setModel(oModel);
        },
        
        onSearch: async function(){
            var me = this;
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                this.onCancelEdit();
            }else{
                this._oDataBeforeChange = {}
                Common.openLoadingDialog(that);
                await this.getAllData();
                await this.getTableColumns();
                this.byId("btnNew").setEnabled(true);
                this.byId("btnEdit").setEnabled(true);
                this.byId("btnDelete").setEnabled(true);
                this.byId("btnClose").setEnabled(true);
                this.byId("btnSave").setEnabled(true);
                this.byId("btnCancel").setEnabled(true);
                this.byId("btnTabLayout").setEnabled(true);
                this.byId("btnView").setEnabled(true);


                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                Common.closeLoadingDialog(that);

                var oJSONModel = new JSONModel();
                var iCounter = 0;
                var itemResult = [];
                var vSBU = this.getView().getModel("ui").getData().sbu;
                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PR_FILTERS_CDS");

                await new Promise((resolve, reject) => {
                    oModel.read("/ZVB_3DERP_MATTYPE_SH", {
                        success: function (oData, oResponse) {
                            for(var item in oData.results){
                                iCounter++;
                                if(oData.results[item].SBU === vSBU){
                                    itemResult.push(oData.results[item])
                                }
                                if(iCounter === oData.results.length){
                                    oJSONModel.setData(itemResult)
                                    me.getView().setModel(oJSONModel, "matTypSource");
                                    resolve();
                                }
                            }
                        },
                        error: function (err) { }
                    });
                })

                itemResult = [];
                oJSONModel = new JSONModel();
                iCounter = 0;
                await new Promise((resolve, reject) => {
                    oModel.read("/ZVB_3DERP_SEASON_SH", {
                        success: function (oData, oResponse) {
                            for(var item in oData.results){
                                iCounter++;
                                if(oData.results[item].SBU === vSBU){
                                    itemResult.push(oData.results[item])
                                }
                                if(iCounter === oData.results.length){
                                    oJSONModel.setData(itemResult)
                                    me.getView().setModel(oJSONModel, "seasonSource");
                                    resolve();
                                }
                            }
                        },
                        error: function (err) { }
                    });
                })
                
            }
            
        },

        getAllData: async function(){
            var me = this;

                return new Promise(async (resolve, reject)=>{
                    me.getView().setModel(new JSONModel({
                        results: []
                    }), "TableData");

                    resolve(await me.getPRData());
                });
        },

        getPRData: async function(){
            var oModel = this.getOwnerComponent().getModel();
            var me = this;
            var tblChange = this._tblChange;
            var oJSONModel = new sap.ui.model.json.JSONModel();
            var objectData = [];
            var aFilters = this.getView().byId("SmartFilterBar").getFilters();
            var aFiltersObj = [];
                

            var msgError = this.getView().getModel("captionMsg").getData()["INFO_ERROR"];

            aFiltersObj.push(aFilters);
            aFiltersObj = aFiltersObj[0];

            if (this.getView().byId("SmartFilterBar")) {

                var oCtrlMatTyp = this.getView().byId("SmartFilterBar").determineControlByName("MATTYP");
                var oCtrlSeasonCd = this.getView().byId("SmartFilterBar").determineControlByName("SEASONCD");
                if (oCtrlMatTyp) {
                    console.log(oCtrlMatTyp.getSelectedKey() === "");
                    if(oCtrlMatTyp.getSelectedKey() !== ""){
                        if(aFilters.length === 0){
                            aFiltersObj.push({
                                aFilters: [{
                                    sPath: "MATTYP",
                                    sOperator: "EQ",
                                    oValue1: oCtrlMatTyp.getSelectedKey(),
                                    _bMultiFilter: false
                                }]
                            })
                        }else{
                            aFiltersObj[0].aFilters[parseInt(Object.keys(aFiltersObj[0].aFilters).pop())+1] = ({
                                sPath: "MATTYP",
                                sOperator: "EQ",
                                oValue1: oCtrlMatTyp.getSelectedKey(),
                                _bMultiFilter: false
                            })
                        }
                    }
                }
                if (oCtrlSeasonCd) {
                    console.log(oCtrlSeasonCd.getSelectedKey() === "");
                    if(oCtrlSeasonCd.getSelectedKey() !== ""){
                        if(aFilters.length === 0){
                            aFiltersObj.push({
                                aFilters: [{
                                    sPath: "SEASONCD",
                                    sOperator: "EQ",
                                    oValue1: oCtrlSeasonCd.getSelectedKey(),
                                    _bMultiFilter: false
                                }]
                            })
                        }else{
                            aFiltersObj[0].aFilters[parseInt(Object.keys(aFiltersObj[0].aFilters).pop())+1] = ({
                                sPath: "SEASONCD",
                                sOperator: "EQ",
                                oValue1: oCtrlSeasonCd.getSelectedKey(),
                                _bMultiFilter: false
                            })
                        }
                    }
                }
            }
            
            if (aFilters.length > 0) {
                aFilters[0].aFilters.forEach(item => {
                    if (item.sPath === 'PRNO') {
                        if (!isNaN(item.oValue1)) {
                            while (item.oValue1.length < 10) item.oValue1 = "0" + item.oValue1;
                        }
                    }
                    if (item.sPath === 'VENDOR') {
                        if (!isNaN(item.oValue1)) {
                            while (item.oValue1.length < 10) item.oValue1 = "0" + item.oValue1;
                        }
                    }
                })
            }

            return new Promise((resolve, reject)=>{
                oModel.read("/PRSet", {
                    filters: aFiltersObj,
                    success: function (data, response) {
                        if (data.results.length > 0) {
                            data.results.forEach((item, index) => {
                                item.DELETED = item.DELETED === "" ? false : true;
                                item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
                                item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
                                item.RELDT = dateFormat.format(new Date(item.RELDT));
                                item.REQDT = dateFormat.format(new Date(item.REQDT));
                                item.DELDT = dateFormat.format(new Date(item.DELDT));
                            })
                            
                            objectData.push(data.results);
                            objectData[0].sort((a,b) => (a.ITEM2 > b.ITEM2) ? 1 : ((b.ITEM2 > a.ITEM2) ? -1 : 0));
                            oJSONModel.setData(data);

                            me.getView().getModel("counts").setProperty("/total", data.results.length);
                        }
                        me.getView().setModel(oJSONModel, "TableData");
                        if(tblChange)
                            resolve(me.setTableColumnsData('PRHDR'));
                        resolve();
                    },
                    error: function (err) { 
                        MessageBox.error(msgError);
                        Common.closeLoadingDialog(that);
                    }
                });
            });
        },

        getTableColumns: async function(){
            _promiseResult = new Promise((resolve, reject)=>{
                resolve(this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR'));
            });
            await _promiseResult
        },
        getDynamicColumns: async function(model, dataSource) {
            var me = this;
                var modCode = model;
                var tabName = dataSource;
                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new JSONModel();
                var vSBU = this.getView().byId("cboxSBU").getSelectedKey();
                // var vSBU = this.getView().getModel("ui").getData().sbu;

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                return new Promise((resolve, reject) => {
                    oModel.read("/ColumnsSet", {
                        success: async function (oData, oResponse) {
                            me._columnLoadError = false;
                            if (oData.results.length > 0) {
                                if(modCode === "PRHDR"){
                                    oJSONColumnsModel.setData(oData.results);
                                    me.getView().setModel(oJSONColumnsModel, "Columns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                            }else{
                                me._columnLoadError = true;
                                if(modCode === "PRHDR"){
                                    me.getView().setModel(oJSONColumnsModel, "Columns");
                                    me.setTableColumnsData(modCode);
                                    resolve();
                                }
                            }
                        },
                        error: function(){
                            me._columnLoadError = true;
                            if(modCode === "PRHDR"){
                                me.getView().setModel(oJSONColumnsModel, "Columns");
                                me.setTableColumnsData(modCode);
                                resolve();
                            }
                        }
                    });
                })
        },
        setTableColumnsData(modCode){
            var oColumnsModel;
            var oDataModel;

            var oColumnsData;
            var oData;
            if (modCode === 'PRHDR') {   
                oColumnsModel = this.getView().getModel("Columns");  
                oDataModel = this.getView().getModel("TableData"); 
                
                oColumnsData = oColumnsModel === undefined ? [] :oColumnsModel.getProperty('/');
                oData = oDataModel === undefined ? [] :oDataModel.getProperty('/results');
                
                if(this._columnLoadError){
                    oData = [];
                }                
                this.addColumns("styleDynTable", oColumnsData, oData, modCode);
            }
        },
        addColumns: async function(table, columnsData, data, model) {
            var me = this;
            var oModel = new JSONModel();
            oModel.setData({
                columns: columnsData,
                rows: data
            });
            var oDelegateKeyUp = {
                onkeyup: function(oEvent){
                    that.onkeyup(oEvent);
                },
                
                
                onsapenter : function(oEvent){
                    that.onSapEnter(oEvent);
                }
            };

            
            this.byId(table).addEventDelegate(oDelegateKeyUp);
            var oTable = this.getView().byId(table);
            oTable.setModel(oModel);
            
            //double click event
            oTable.attachBrowserEvent('dblclick',function(e){
                e.preventDefault();
                if(me.getView().getModel("ui").getData().dataMode === 'READ'){
                    me.goToDetail(); //navigate to detail page
                }
             });

            oTable.bindColumns("/columns", function (index, context) {
                var sColumnId = context.getObject().ColumnName;
                var sColumnLabel = context.getObject().ColumnLabel;
                var sColumnType = context.getObject().DataType;
                var sColumnVisible = context.getObject().Visible;
                var sColumnSorted = context.getObject().Sorted;
                var sColumnSortOrder = context.getObject().SortOrder;
                var sColumnWidth = context.getObject().ColumnWidth;
                if (sColumnType === "STRING" || sColumnType === "DATETIME"|| sColumnType === "BOOLEAN") {
                    return new sap.ui.table.Column({
                        id: sColumnId,
                        label: sColumnLabel,
                        template: me.columnTemplate(sColumnId), //default text
                        width: sColumnWidth + "px",
                        hAlign: me.columnSize(sColumnId),
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                }else if (sColumnType === "NUMBER") {
                    return new sap.ui.table.Column({
                        id: sColumnId,
                        label: sColumnLabel,
                        template: new sap.m.Text({ text: "{" + sColumnId + "}", wrapping: false, tooltip: "{" + sColumnId + "}" }), //default text
                        width: sColumnWidth + "px",
                        hAlign: "End",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                }

            });

            //bind the data to the table
            oTable.bindRows("/rows");
        },
        columnTemplate: function(sColumnId){
            var oColumnTemplate;
            oColumnTemplate = new sap.m.Text({ 
                text: "{" + sColumnId + "}", 
                wrapping: false, 
                tooltip: "{" + sColumnId + "}" 
            }); //default text
            if (sColumnId === "DELETED") { 
                //Manage button
                oColumnTemplate = new sap.m.CheckBox({
                    selected: "{" + sColumnId + "}",
                    editable: false
                });
            }
            if (sColumnId === "CLOSED") { 
                //Manage button
                oColumnTemplate = new sap.m.CheckBox({
                    selected: "{" + sColumnId + "}",
                    editable: false
                });
            }

            return oColumnTemplate;
        },
        columnSize: function(sColumnId){
            var oColumnSize;
            if (sColumnId === "DELETED") { 
                //Manage button
                oColumnSize = "Center";
            }
            if (sColumnId === "CLOSED") { 
                //Manage button
                oColumnSize = "Center";
            }
            return oColumnSize;
        },

        onSapEnter(oEvent) {
            if(that.getView().getModel("ui").getData().dataMode === 'READ'){
                that.goToDetail(); //navigate to detail page
            }
        },

        onkeyup: async function(oEvent){
            var promiseResult;
            if((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows"){
                var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["undefined"].sPath;
                sRowPath = "/results/"+ sRowPath.split("/")[2];
                var index = sRowPath.split("/");

                var oRow = this.getView().getModel("TableData").getProperty(sRowPath);
                var oTable = this.byId("styleDynTable");

                promiseResult = new Promise((resolve, reject)=>{
                    me._tblChange = true;
                    oTable.getRows().forEach(row => {
                        if(row.getBindingContext().sPath.replace("/rows/", "") === index[2]){
                            resolve(row.addStyleClass("activeRow"));
                        }else{
                            resolve(row.removeStyleClass("activeRow"));
                        }
                    });
                });
                await promiseResult;
                _PRNO = oRow['PRNO'];
                _PRITM = oRow['PRITM'];

                this._tblChange = false;
            }
        },

        // onSelectionChange: function(oEvent) {
        //     // var oTable = this.getView().byId("styleDynTable");
        //     // iSelectedIndex = oEvent.getSource().getSelectedIndex();
        //     // oTable.setSelectedIndex(iSelectedIndex);

        //     var sPath = oEvent.getParameter("rowContext").getPath();
        //     var oTable = this.getView().byId("styleDynTable");
        //     var model = oTable.getModel();

        //     // var index = sPath.split("/");
        //     // console.log(index[2]);
        //     // oTable.removeSelectionInterval(parseInt(index[2] - 1), parseInt(index[2] - 1));

        //     //get the selected  data from the model and set to variable PRNo/PRITM
        //     var data  = model.getProperty(sPath); 

        //     _PRNO = data['PRNO'];
        //     _PRITM = data['PRITM'];
        // },
        onCellClick: async function(oEvent){
            var promiseResult;
            var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
            sRowPath = "/results/"+ sRowPath.split("/")[2];
            var oRow = this.getView().getModel("TableData").getProperty(sRowPath);
            var oTable = this.byId("styleDynTable");

            promiseResult = new Promise((resolve, reject)=>{
                this._tblChange = true;
                oTable.getRows().forEach(row => {
                    if(row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.split("/")[2]){
                        resolve(row.addStyleClass("activeRow"));
                    }else{
                        resolve(row.removeStyleClass("activeRow"));
                    }
                });
            });
            await promiseResult;
            _PRNO = oRow['PRNO'];
            _PRITM = oRow['PRITM'];

            this._tblChange = false;
        },

        goToDetail: function (oEvent) {
            //var oButton = oEvent.getSource();
            var PRNo = _PRNO;//oButton.data("PRNO").PRNO; //get the styleno binded to manage button
            var PRItm = _PRITM;//oButton.data("PRNO").PRITM;
            
            if(PRNo != "" || PRNo != null){
                while(PRNo.length < 10) PRNo = "0" + PRNo;
            }
            
            // that.setChangeStatus(false); //remove change flag
            that.navToDetail(PRNo, PRItm); //navigate to detail page
        },

        navToDetail: function (PRNo, PRItm) {
            //route to detail page
            that._router.navTo("PRDetail", {
                PRNO: PRNo,
                PRITM: PRItm
            });
        },

        onEditTbl: async function(){
            // Common.openLoadingDialog(that);
            var bProceed = true;
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                bProceed = false;
            }
            if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                bProceed = false;
            }
            if(this._appAction === "display"){
                bProceed = false;
            }

            if(bProceed){
                var oModel = this.getOwnerComponent().getModel();
                var oEntitySet = "/PRSet";
                var me = this;
                
                var vSBU = this.getView().byId("cboxSBU").getSelectedKey();

                var oTable = this.byId("styleDynTable");
                var aSelIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = this.getView().getModel("TableData").getData().results;//this._oDataBeforeChange.results != undefined? this._oDataBeforeChange.results : this.getView().getModel("TableData").getData().results;
                var aDataToEdit = [];
                var bDeleted = false, bWithMaterial = false;
                var iCounter = 0;
                var promiseResult;
                this._oLockData = [];

                //MessageBox Message
                var msgAlreadyDeleted = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_DELETED"];
                var msgNoDataToEdit = this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_EDIT"];
                var msgAlreadyClosed = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_CLOSED"];

                //Initiate Edit Validation to Empty
                this._oDataOnEditValidate = []

                if (aSelIndices.length > 0) {
                    aSelIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    aSelIndices = oTmpSelectedIndices;
                    for(var item of aSelIndices){
                        if (aData.at(item).DELETED === true) {
                            iCounter++;
                            bDeleted = true;
    
                            if (aSelIndices.length === iCounter) {
                                MessageBox.information(msgAlreadyDeleted);
                            }
                        }else if(aData.at(item).CLOSED === true){
                            iCounter++;
                            if (aSelIndices.length === iCounter) {
                                MessageBox.information(msgAlreadyClosed);
                            }
                        }
                        else {
                            var PRNo = aData.at(item).PRNO
                            var PRItm = aData.at(item).PRITM
    
                            if(PRNo != "" || PRNo != null){
                                while(PRNo.length < 10) PRNo = "0" + PRNo;
                            }
                            me._oLockData.push({
                                Prno: PRNo,
                                Prln: PRItm
                            });
                            await new Promise((resolve, reject)=>{
                                oModel.read(oEntitySet + "(PRNO='" + PRNo + "',PRITM='"+ PRItm +"')", {
                                    success: async function (data, response) {
                                        iCounter++;
                                        // await me.checkEditableFields(aData.at(item).DOCTYP, PRNo, PRItm);
                                        aDataToEdit.push(aData.at(item));
    
                                        promiseResult = new Promise((resolve, reject)=>{
                                            oModel.read("/ZERP_CHECKSet", {
                                                urlParameters: {
                                                    "$filter":"SBU eq '"+ vSBU +"' and FIELD1 eq '"+ aData.at(item).DOCTYP +"'"
                                                },
                                                success: async function (data, response) {
                                                    var count = 0;
                                                    var indx = 0;
                                                    var strDocTyp = "";
                                                    var strObj = {}
                                                    data.results.forEach(async dataItem => {
                                                        count++
                                                        strDocTyp = dataItem.FIELD1;
                                                    })
                                                    strObj["DOCTYP"] = (strDocTyp);
                                                    strObj["results"] = data.results
                                                    me._oDataOnEditValidate.push(strObj)
                                                    // indx = parseInt(Object.keys(me._oDataOnEditValidate).pop());
                                                    // me._oDataOnEditValidate[indx].DOCTYP = strDocTyp;
                                                    resolve();
                                                    // console.log((Object.keys(me._oDataOnEditValidate).pop()));
                                                    // me._oDataOnEditValidate[(Object.keys(me._oDataOnEditValidate).pop())].results[parseInt(Object.keys(me._oDataOnEditValidate[(Object.keys(me._oDataOnEditValidate).pop())].results).pop()) + 1] = {PRNO: PRNo};
                                                    // me._oDataOnEditValidate[(Object.keys(me._oDataOnEditValidate).pop())].results[parseInt(Object.keys(me._oDataOnEditValidate[(Object.keys(me._oDataOnEditValidate).pop())].results).pop()) + 2] = {PRITM: PRItm};
                                                    // me._oDataOnEditValidate.results[parseInt(Object.keys(me._oDataOnEditValidate.results).pop()) + 1].PRITM = PRItm
                                                },
                                                error: function(error){
                                                    resolve();
                                                }
                                            });
                                        });
                                        await promiseResult;
                                        resolve();
                                        
                                    },
                                    error: function (err) {
                                        iCounter++;
                                    }
                                });
                            });
                            if (aSelIndices.length === iCounter) {
                                if (aDataToEdit.length === 0) {
                                    MessageBox.information(msgNoDataToEdit);
                                }
                                else {
                                    if(await me.prLock(me)){
                                        me.byId("btnNew").setVisible(false);
                                        me.byId("btnEdit").setVisible(false);
                                        me.byId("btnDelete").setVisible(false);
                                        me.byId("btnClose").setVisible(false);
                                        me.byId("btnSave").setVisible(true);
                                        me.byId("btnCancel").setVisible(true);
                                        me.byId("btnTabLayout").setVisible(false);
                                        me.byId("btnView").setVisible(false);

                                        me._oDataBeforeChange = jQuery.extend(true, {}, me.getView().getModel("TableData").getData());
                                        
                                        me.getView().getModel("TableData").setProperty("/results", aDataToEdit);
                                        await me.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR')
                                        me.setRowEditMode();
                        
                                        me.getView().getModel("ui").setProperty("/dataMode", 'EDIT');
                                        me._isGMCEdited = false;
                                    }
                                }
                            }
                            
                        }
                    }
                }
                else {
                    // aDataToEdit = aData;
                    MessageBox.information(msgNoDataToEdit);
                }
            }
            // Common.closeLoadingDialog(that);
            // aDataToEdit = aDataToEdit.filter(item => item.Deleted === false);
        },
        setRowEditMode: async function(){
            var me = this;
            // this.getView().getModel(model).getData().results.forEach(item => item.Edited = false);
            var oTable = this.byId("styleDynTable");

            var oColumnsModel = this.getView().getModel("Columns");
            var oColumnsData = oColumnsModel.getProperty('/');

            var oParamData;

            //Filtering and get only distinct value
            oParamData = this._oDataOnEditValidate.filter((value, index, self) => self.findIndex(item => item.DOCTYP === value.DOCTYP) === index)

            oTable.getColumns().forEach((col, idx) => {
                oColumnsData.filter(item => item.ColumnName === col.sId)
                .forEach(ci => {
                    var sColumnType = ci.DataType;
                    if (ci.Editable) {
                        if (sColumnType === "STRING") {
                            col.setTemplate(new sap.m.Input({
                                // id: "ipt" + ci.name,
                                type: "Text",
                                maxLength: +ci.Length,
                                showValueHelp: true,
                                valueHelpRequest: this.handleValueHelp.bind(this),
                                showSuggestion: true,
                                // maxSuggestionWidth: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].maxSuggestionWidth : "1px",
                                // suggestionItems: {
                                //     path: '/PRSet', //ci.valueHelp.model + ">/items", //ci.valueHelp["suggestionItems"].path,
                                //     length: 1000,
                                //     template: new sap.ui.core.ListItem({
                                //         key: "{PRNO}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}",
                                //         text: "{PRITM}", //"{" + ci.valueHelp.model + ">" + ci.valueHelp["items"].value + "}", //ci.valueHelp["suggestionItems"].text
                                //         //additionalText: ci.valueHelp["suggestionItems"].additionalText !== undefined ? ci.valueHelp["suggestionItems"].additionalText : '',
                                //     }),
                                //     templateShareable: false
                                // },
                                liveChange: this.onInputLiveChange.bind(this),
                                enabled: {
                                    path: "DOCTYP",
                                    formatter: function (DOCTYP) {
                                        var result; 
                                        oParamData.forEach(async (data)=>{
                                            if(DOCTYP === data.DOCTYP){
                                                data.results.forEach((data1)=>{
                                                    if(ci.ColumnName === data1.FIELD2){
                                                        if(data1.FIELD3 == "D"){
                                                            result = false;
                                                        }else if(data1.FIELD3 == "MD"){
                                                            result = false;
                                                        }
                                                    }

                                                    if(data1.FIELD3 === "MU"){
                                                        ci.Mandatory = true;
                                                    }else if(data1.FIELD3 === "OU"){
                                                        ci.Mandatory = false;
                                                    }else if(data1.FIELD3 === "R"){
                                                        ci.Mandatory = true;
                                                    }else if(data1.FIELD3 === "U"){
                                                        ci.Mandatory = true;
                                                    }
                                                })
                                            }
                                        });
                                        return result;
                                    }

                                },
                                value: {
                                    path: ci.ColumnName, 
                                    mandatory: ci.Mandatory 
                                },
                            }));
                        }else if (sColumnType === "DATETIME"){
                            col.setTemplate(new sap.m.DatePicker({
                                // id: "ipt" + ci.name,
                                displayFormat:"short",
                                change:"handleChange",
                                
                                // liveChange: this.onInputLiveChange.bind(this),
                                enabled: {
                                    path: "DOCTYP",
                                    formatter: function (DOCTYP) {
                                        var result; 
                                        oParamData.forEach(async (data)=>{
                                            if(DOCTYP === data.DOCTYP){
                                                data.results.forEach((data1)=>{
                                                    if(ci.ColumnName === data1.FIELD2){
                                                        if(data1.FIELD3 == "D"){
                                                            result = false;
                                                        }else if(data1.FIELD3 == "MD"){
                                                            result = false;
                                                        }
                                                    }
                                                    
                                                    if(data1.FIELD3 === "MU"){
                                                        ci.Mandatory = true;
                                                    }else if(data1.FIELD3 === "OU"){
                                                        ci.Mandatory = false;
                                                    }else if(data1.FIELD3 === "R"){
                                                        ci.Mandatory = true;
                                                    }else if(data1.FIELD3 === "U"){
                                                        ci.Mandatory = true;
                                                    }
                                                })
                                            }
                                        });
                                        return result;
                                    }
                                },
                                value: "{path: '" + ci.ColumnName + "', mandatory: '"+ ci.Mandatory +"'}",
                            }));
                        }else if (sColumnType === "NUMBER"){
                            col.setTemplate(new sap.m.Input({
                                // id: "ipt" + ci.name,
                                type: sap.m.InputType.Number,
                                value: "{path:'" + ci.ColumnName + "', type:'sap.ui.model.type.Decimal', formatOptions:{ minFractionDigits:" + null + ", maxFractionDigits:" + null + " }, constraints:{ precision:" + ci.Decimal + ", scale:" + null + " }}",

                                maxLength: +ci.Length,

                                liveChange: this.onNumberLiveChange.bind(this),
                                enabled: {
                                    path: "DOCTYP",
                                    formatter: function (DOCTYP) {
                                        var result; 
                                        oParamData.forEach(async (data)=>{
                                            if(DOCTYP === data.DOCTYP){
                                                data.results.forEach((data1)=>{
                                                    if(ci.ColumnName === data1.FIELD2){
                                                        if(data1.FIELD3 == "D"){
                                                            result = false;
                                                        }else if(data1.FIELD3 == "MD"){
                                                            result = false;
                                                        }
                                                    }

                                                    if(data1.FIELD3 === "MU"){
                                                        ci.Mandatory = true;
                                                    }else if(data1.FIELD3 === "OU"){
                                                        ci.Mandatory = false;
                                                    }else if(data1.FIELD3 === "R"){
                                                        ci.Mandatory = true;
                                                    }else if(data1.FIELD3 === "U"){
                                                        ci.Mandatory = true;
                                                    }
                                                })
                                            }
                                        });
                                        return result;
                                    }
                                }

                            }));
                        }
                    }
                })
            });
            
        },
        onInputLiveChange: function(oEvent) {
            // console.log(oEvent.getSource().getBindingInfo("value").binding.oValue);
            // console.log(oEvent.getSource().getBindingInfo("value").mandatory);
            // console.log(oEvent.getParameters().value);
            // console.log(oEvent.getSource().getBindingInfo("value"));
            // console.log(oEvent.getSource());
            // console.log(oEvent.getParameters());

            if(oEvent.getSource().getBindingInfo("value").mandatory){
                if(oEvent.getParameters().value === ""){
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Required Field");
                    this.validationErrors.push(oEvent.getSource().getId());
                }else{
                    oEvent.getSource().setValueState("None");
                    this.validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this.validationErrors.splice(index, 1)
                        }
                    })
                }
            }
            //if original value is equal to change value
            if(oEvent.getParameters().value === oEvent.getSource().getBindingInfo("value").binding.oValue){
                this._isEdited = false;
            }else{
                this._isEdited = true;
            }
        },
        onNumberLiveChange: function(oEvent){
            if(oEvent.getSource().getBindingInfo("value").mandatory){
                if(oEvent.getParameters().value === ""){
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Required Field");
                    this.validationErrors.push(oEvent.getSource().getId());
                }else{
                    oEvent.getSource().setValueState("None");
                    this.validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this.validationErrors.splice(index, 1)
                        }
                    })
                }
            }

            if (oEvent.getParameters().value.split(".").length > 1) {
                if (oEvent.getParameters().value.split(".")[1].length > 3) {
                    // console.log("invalid");
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Enter a number with a maximum of 3 decimal places.");
                    this.validationErrors.push(oEvent.getSource().getId());

                }else{
                    oEvent.getSource().setValueState("None");
                    this.validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this.validationErrors.splice(index, 1)
                        }
                    })
                }
            }else{
                oEvent.getSource().setValueState("None");
                this.validationErrors.forEach((item, index) => {
                    if (item === oEvent.getSource().getId()) {
                        this.validationErrors.splice(index, 1)
                    }
                })
            }
            //if original value is equal to change value
            if(oEvent.getParameters().value === oEvent.getSource().getBindingInfo("value").binding.oValue){
                this._isEdited = false;
            }else{
                this._isEdited = true;
            }
        },
        // onValueHelpLiveInputChange: function(oEvent) {
        //     if (this.validationErrors === undefined) this.validationErrors = [];

        //     var oSource = oEvent.getSource();
        //     var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
        //     oSource.setValueState(isInvalid ? "Error" : "None");

        //     var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
        //     var sModel = oSource.getBindingInfo("value").parts[0].path;

        //     // if (!oSource.getSelectedKey()) {
        //         oSource.getSuggestionItems().forEach(item => {
        //             // console.log(item.getProperty("key"), oSource.getValue().trim())
        //             if (item.getProperty("key") === oSource.getValue().trim()) {
        //                 isInvalid = false;
        //                 oSource.setValueState(isInvalid ? "Error" : "None");                            
                        
        //                 if (oSource.getBindingInfo("value").parts[0].path === 'MATTYP') {
        //                     var et = item.getBindingContext().sPath;
        //                     this.getView().getModel(sModel).setProperty(sRowPath + '/PROCESSCD', item.getBindingContext().getModel().oData[et.slice(1, et.length)].Processcd);
        //                 }
        //             }
        //         })
        //     // }

        //     if (isInvalid) this.validationErrors.push(oEvent.getSource().getId());
        //     else {
        //         this.validationErrors.forEach((item, index) => {
        //             if (item === oEvent.getSource().getId()) {
        //                 this.validationErrors.splice(index, 1)
        //             }
        //         })
        //     }

        //     // this.getView().getModel(sModel).setProperty(sRowPath + '/Edited', true);

        //     if (sModel === 'gmc') this._isGMCEdited = true;
        //     else if (sModel === 'attributes') this._isAttrEdited = true;
        //     // console.log(oSource.getBindingInfo("value").parts)
        // },
        handleValueHelp: function(oEvent) {
            var oModel = this.getOwnerComponent().getModel('ZVB_3DERP_PR_FILTERS_CDS');
            var oSource = oEvent.getSource();
            // var sEntity = oSource.getBindingInfo("suggestionItems").path;
            var sModel = oSource.getBindingInfo("value").parts[0].model;
            var _this = this;

            this._inputId = oSource.getId();
            this._inputValue = oSource.getValue();
            this._inputSource = oSource;

            this._inputField = oSource.getBindingInfo("value").parts[0].path;
            // console.log(this._inputId, this._inputValue, this._inputSource, this._inputField)
            // this.getView().setModel(oJSONModel, "materials");

            if (this._inputField === 'MATNO') {
                this._inputSourceCtx = oEvent.getSource().getBindingContext("class");
                // var _mattypcls = this._inputSourceCtx.getModel().getProperty(this._inputSourceCtx.getPath() + '/MATTYPCLS');

                oModel.read('/ZVB_3DERP_PRMATNO',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.MatNo;
                            item.VHDesc = item.GMCDesc;
                            item.VHDesc2 = null;
                            item.VHSelected = (item.MatNo === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Material");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            if (this._inputField === 'MATGRP') {
                oModel.read('/ZVB_3DERP_MATGRP_SH',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.MaterialGrp;
                            item.VHDesc = null;
                            item.VHDesc2 = null;
                            item.VHSelected = (item.MaterialGrp === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Material Group");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Material Group"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Mat. Grp."
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            if (this._inputField === 'SHIPTOPLANT') {
                oModel.read('/ZVB_3DERP_SHIPTOPLANT_SH',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.ShipToPlant;
                            item.VHDesc = null;
                            item.VHDesc2 = null;
                            item.VHSelected = (item.ShipToPlant === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Ship-to Plant");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Ship-To Plant"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Ship-To Plant"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            if (this._inputField === 'PLANTCD') {
                oModel.read('/ZVB_3DERP_PURPLANT_SH',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.PurchPlant;
                            item.VHDesc = null;
                            item.VHDesc2 = null;
                            item.VHSelected = (item.PurchPlant === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Plant");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Plant"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Plant"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            if (this._inputField === 'VENDOR') {
                oModel.read('/ZVB_3DERP_VENDOR_SH',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.Vendor;
                            item.VHDesc = item.Description;
                            item.VHDesc2 = item.CountryCd;
                            item.VHSelected = (item.Vendor === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Vendor");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Vendor"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Vendor"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
            if (this._inputField === 'SUPTYP') {
                oModel.read('/ZVB_3DERP_SUPPTYP_SH',{
                    success: function (data, response) {
                        data.results.forEach(item => {
                            item.VHTitle = item.SupTyp;
                            item.VHDesc = item.ShortText;
                            item.VHDesc2 = null;
                            item.VHSelected = (item.SupTyp === _this._inputValue);
                        });

                        data.results.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                        // create value help dialog
                        if (!_this._valueHelpDialog) {
                            _this._valueHelpDialog = sap.ui.xmlfragment(
                                "zuipr.view.dialog.ValueHelpDialog",
                                _this
                            ).setProperty("title", "Select Supply Type");
                        
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Supply Type"
                                })
                            )
                            _this.getView().addDependent(_this._valueHelpDialog);
                        }
                        else {
                            _this._valueHelpDialog.setModel(
                                new JSONModel({
                                    items: data.results,
                                    title: "Supply Type"
                                })
                            )
                        }

                        _this._valueHelpDialog.open();                        
                    },
                    error: function (err) { }
                })
            }
        },
        handleValueHelpSearch : function (oEvent) {
            var sValue = oEvent.getParameter("value");

            var oFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("VHTitle", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("VHDesc", sap.ui.model.FilterOperator.Contains, sValue)
                ],
                and: false
            });

            oEvent.getSource().getBinding("items").filter([oFilter]);
        },
        handleValueHelpClose : function (oEvent) {
            if (oEvent.sId === "confirm") {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                var sTable = this._valueHelpDialog.getModel().getData().table;
                if (oSelectedItem) {
                    this._inputSource.setValue(oSelectedItem.getTitle());

                    var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;
                    if (this._inputValue !== oSelectedItem.getTitle()) {                                
                        this.getView().getModel(sTable).setProperty(sRowPath + '/Edited', true);

                        this._isEdited = true;
                    }
                }

                this._inputSource.setValueState("None");
            }
            else if (oEvent.sId === "cancel") {
                // console.log(oEvent.getSource().getBinding("items"));
                // var source = oEvent.getSource().getBinding("items").oList;
                // var data = source.filter(item => item.VHSelected === true);
                // var value = "";

                // if (data.length > 0) {
                //     value = data[0].VHTitle;
                // }

                // this._inputSource.setValue(value);

                // if (this._inputValue !== value) {
                //     var data = this.byId("headerTable").getBinding("items").oList;                           
                //     data.filter(item => item[this.inputField] === oSelectedItem.getTitle()).forEach(e => e.Edited = true);
                // }
            }
        },
        searchGlobal: function(oEvent){
            if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                return;
            }
            var oTable = oEvent.getSource().oParent.oParent;
            var sTable = oTable.getBindingInfo("rows");
            var sQuery = oEvent.getParameter("query");
            if (sTable === "gmc") {
                this.byId("searchFieldAttr").setProperty("value", "");
                this.byId("searchFieldMatl").setProperty("value", "");
            }

            this.exeGlobalSearch(sQuery);
        },
        exeGlobalSearch(query) {
            var oFilter = null;
            var aFilter = [];
            var oTable = this.byId("styleDynTable");
            var oColumnsModel = this.getView().getModel("Columns");
            var oColumnsData = oColumnsModel.getProperty('/');
            
            if (query) {
                oTable.getColumns().forEach((col, idx) => {
                    var sDataType = oColumnsData.filter(item => item.ColumnName === col.sId)[0].ColumnName

                    if(sDataType != "DELETED" && sDataType != "CLOSED")
                        aFilter.push(new Filter(sDataType, FilterOperator.Contains, query));
                    else
                        aFilter.push(new Filter(sDataType, FilterOperator.EQ, query));
                })
                oFilter = new Filter(aFilter, false);
            }
            this.byId("styleDynTable").getBinding("rows").filter(oFilter, "Application");
        },
        onCancelEdit: async function() {
            if (this._isEdited) {

                if (!this._DiscardChangesDialog) {
                    this._DiscardChangesDialog = sap.ui.xmlfragment("zuipr.view.dialog.DiscardChangesDialog", this);
                    this.getView().addDependent(this._DiscardChangesDialog);
                }
                
                this._DiscardChangesDialog.open();
            }
            else {
                Common.openLoadingDialog(that);
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.byId("btnTabLayout").setVisible(true);
                this.byId("btnView").setVisible(true);
                this.validationErrors = [];
                
                await this.prUnLock();
                await this.getAllData();
                await this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR');
                
                if (this.getView().getModel("ui").getData().dataMode === 'NEW') this.setFilterAfterCreate();

                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
                Common.closeLoadingDialog(that);
            }
        },
        onCloseDiscardChangesDialog: async function() {
            if (this._isEdited) {
                Common.openLoadingDialog(that);
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.byId("btnTabLayout").setVisible(true);
                this.byId("btnView").setVisible(true);

                await this.getAllData();
                await this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR');

                Common.closeLoadingDialog(that);
            }
            this.validationErrors = [];
            this._DiscardChangesDialog.close();
            this.getView().getModel("ui").setProperty("/dataMode", 'READ');
            this._isEdited = false;
        },
        onCancelDiscardChangesDialog() {
            this._DiscardChangesDialog.close();
        },

        setFilterAfterCreate: function(oEvent) {
            if (this._aFiltersBeforeChange.length > 0) {
                var aFilter = [];
                var oFilter = null;
                var oTable = this.byId("styleDynTable");
                var oColumns = oTable.getColumns();
                this._aFiltersBeforeChange.forEach(item => {
                    aFilter.push(new Filter(item.sPath, this.getConnector(item.sOperator), item.oValue1));
                    oColumns.filter(fItem => fItem.getFilterProperty() === item.sPath)
                        .forEach(col => col.filter(item.oValue1))
                }) 
            }
        },
        getConnector(args) {
            var oConnector;

            switch (args) {
                case "EQ":
                    oConnector = sap.ui.model.FilterOperator.EQ
                    break;
                  case "Contains":
                    oConnector = sap.ui.model.FilterOperator.Contains
                    break;
                  default:
                    // code block
                    break;
            }

            return oConnector;
        },
        onSaveEdit: async function(){
            if(this.getView().getModel("ui").getData().dataMode != 'EDIT'){
                return;
            }
            Common.openLoadingDialog(that);
            var me = this;
            var oTable = this.byId("styleDynTable");
            var oSelectedIndices = oTable.getBinding("rows").aIndices;
            var oTmpSelectedIndices = [];
            var aData = oTable.getModel().getData().rows;
            var oParamData = [];
            var oParam = {};
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
            var message = "";
            var promiseResult;

            //MessageBox Message
            var msgError = this.getView().getModel("captionMsg").getData()["INFO_ERROR"];
            
            if (this.validationErrors.length != 0){
                MessageBox.error(msgError);
                return;
            }
            oSelectedIndices.forEach(item => {
                oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
            })

            oSelectedIndices = oTmpSelectedIndices;
            oSelectedIndices.forEach((item, index) => {
                if(aData.at(item).PRNO != "" || aData.at(item).PRNO != null){
                    while(aData.at(item).PRNO.length < 10) aData.at(item).PRNO = "0" + aData.at(item).PRNO;
                }
                oParamData.push({
                    PreqNo: aData.at(item).PRNO,
                    PreqItem: aData.at(item).PRITM,
                    Matno: aData.at(item).MATNO,
                    Uom: aData.at(item).UOM,
                    Quantity: aData.at(item).QUANTITY,
                    DelivDate: sapDateFormat.format(new Date(aData.at(item).DELDT)) + "T00:00:00",
                    Batch: aData.at(item).BATCH,
                    Plant: aData.at(item).PLANTCD,
                    Purgrp: aData.at(item).PURGRP,
                    Reqsnr: aData.at(item).REQSTNR,
                    DesVendor: aData.at(item).VENDOR,
                    PurchOrg: aData.at(item).PURORG,
                    Trackingno: aData.at(item).TRCKNO,
                    Supplytyp: aData.at(item).SUPTYP,
                    InfoRec: aData.at(item).INFNR,
                    Shiptoplant: aData.at(item).SHIPTOPLANT,
                    Seasoncd: aData.at(item).SEASONCD,
                    ShortText: aData.at(item).SHORTTEXT,
                    Callbapi: 'X'
                })
            })

            if (oParamData.length > 0) {
                oParam['N_ChangePRParam'] = oParamData;
                oParam['N_ChangePRReturn'] = [];
                promiseResult = new Promise((resolve, reject)=>{
                    oModel.create("/ChangePRSet", oParam, {
                        method: "POST",
                        success: function(oResultCPR, oResponse) {
                            oSelectedIndices.forEach((item, index) => {
                                var oRetMsg = oResultCPR.N_ChangePRReturn.results.filter(fItem => fItem.PreqNo === aData.at(item).PRNO )//&& fItem.PreqItem === aData.at(item).PRITM);
    
                                if (oRetMsg.length > 0) {
                                    if (oRetMsg[0].Type === 'S') {
                                        message = message + oRetMsg[0].Message + "\n"
                                    }else{
                                        message = message + oRetMsg[0].Message + "\n"
                                    }
                                }
                                else{
                                    message = message + "Error Occured in " + aData.at(item).PRNO + "\n"
                                }
                                resolve();
    
                            })
                            
                            MessageBox.information(message);
                            
                        },
                        error: function() {
                            message = msgError
                            MessageBox.error(message);
                            resolve();
                        }
                    })
                });

                await promiseResult;
                await this.getAllData();
                await this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR')
                await this.prUnLock();
                
                Common.closeLoadingDialog(that);
                
                this.byId("btnNew").setVisible(true);
                this.byId("btnEdit").setVisible(true);
                this.byId("btnDelete").setVisible(true);
                this.byId("btnClose").setVisible(true);
                this.byId("btnSave").setVisible(false);
                this.byId("btnCancel").setVisible(false);
                this.byId("btnTabLayout").setVisible(true);
                that.byId("btnView").setVisible(true);
                this.validationErrors = [];
                this._isEdited = false;
                
                
                this.getView().getModel("ui").setProperty("/dataMode", 'READ');
            }
        },
        onDeletePR: async function(){
            var me = this;
            var bProceed = true;
            var message = "";
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                bProceed = false;
            }
            if(this.getView().getModel("ui").getData().dataMode === 'NODATA'){
                bProceed = false;
            }
            if(this._appAction === "display"){
                bProceed = false;
            }

            if(bProceed){
                Common.openLoadingDialog(that);
                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("TableData").getData());
                var oTable = this.byId("styleDynTable");
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oParamData = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var iCounter = 0;
                var isError = false;
                var promiseResult;
                this._oLockData = [];

                //MessageBox Message
                var msgAlreadyDeleted = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_DELETED"];
                var msgAlreadyClosed = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_CLOSED"];
                var msgNoDataToDelete = this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_DELETE"];
                var msgDeletedOrClosed = this.getView().getModel("captionMsg").getData()["INFO_DELETED_OR_CLOSED"];
                
                if(oSelectedIndices.length > 0){
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
        
                    oSelectedIndices = oTmpSelectedIndices;

                    for(var item of oSelectedIndices){
                        if(aData.at(item).DELETED === true){
                            iCounter++;
                            if (oSelectedIndices.length === iCounter) {
                                MessageBox.information(msgAlreadyDeleted);
                            }
                        }else if(aData.at(item).CLOSED === true){
                            
                            iCounter++;

                            if (oSelectedIndices.length === iCounter) {
                                MessageBox.information(msgAlreadyClosed);
                            }
                        }
                        else{
                            var PRNo = aData.at(item).PRNO
                            var PRItm = aData.at(item).PRITM
        
                            if(PRNo != "" || PRNo != null){
                                while(PRNo.length < 10) PRNo = "0" + PRNo;
                            }
                            me._oLockData.push({
                                Prno: PRNo,
                                Prln: PRItm
                            });

                            oParamData.push({
                                PreqNo: PRNo,
                                PreqItem: PRItm,
                                DeleteInd: 'X',
                                CloseInd: ''
                            })
                        }
                    }

                    if(await me.prLock(me)){
                        if (oParamData.length > 0) {
                            oParam['N_DelClosePRParam'] = oParamData;
                            oParam['N_DelClosePRReturn'] = [];
                            promiseResult = new Promise((resolve, reject)=>{
                                oModel.create("/DelClosePRSet", oParam, {
                                    method: "POST",
                                    success: function(oResultDCPR, oResponse){
                                        oSelectedIndices.forEach((item, index) => {
                                            
                                            var oRetMsg = oResultDCPR.N_DelClosePRReturn.results.filter(fItem => fItem.PreqNo === aData.at(item).PRNO )//&& fItem.PreqItem === aData.at(item).PRITM);
                                            if (oRetMsg.length > 0) {
                                                if (oRetMsg[0].Type === 'I') {
                                                    message = message + oRetMsg[0].Message + "\n"
                                                }else{
                                                    isError = true;
                                                    message = message + oRetMsg[0].Message + "\n"
                                                }
                                            }else{
                                                isError = true;
                                                message = message + "PR: "+aData.at(item).PRNO + "/" + aData.at(item).PRITM + " "+ msgDeletedOrClosed + "\n"
                                            }
                                            resolve();
                                        });
                                    },error: function(err){
                                        message = message + "Error Encountered! Please try agian! \n"
                                        isError = true;
                                        resolve();
                                    }
                                });
                            });
                            await promiseResult;
                        }
                        if (!isError){
                            await this.getAllData();
                            await this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR')
                            await this.prUnLock();
                        }
                    }
                }else{
                    message = msgNoDataToDelete;
                }
                Common.closeLoadingDialog(that);
                if(message !== "")
                    MessageBox.information(message);
            }
            
            
        },
        onClosePR: async function(){
            var me = this;
            var bProceed = true;
            var message = "";
            if(this.getView().getModel("ui").getData().dataMode === 'EDIT'){
                bProceed = false;
            }
            if(bProceed){
                Common.openLoadingDialog(that);
                this._oDataBeforeChange = jQuery.extend(true, {}, this.getView().getModel("TableData").getData());
                var oTable = this.byId("styleDynTable");
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var oParamData = [];
                var oParam = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var iCounter = 0;
                var isError = false;
                var promiseResult;
                this._oLockData = [];

                //MessageBox Message
                var msgAlreadyDeleted = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_DELETED"];
                var msgAlreadyClosed = this.getView().getModel("captionMsg").getData()["INFO_ALREADY_CLOSED"];
                var msgNoDataToClose = this.getView().getModel("captionMsg").getData()["INFO_NO_DATA_CLOSE"];
                var msgDeletedOrClosed = this.getView().getModel("captionMsg").getData()["INFO_DELETED_OR_CLOSED"];

                if(oSelectedIndices.length > 0){
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })
        
                    oSelectedIndices = oTmpSelectedIndices;

                    for(var item of oSelectedIndices){
                        if(aData.at(item).DELETED === true){
                            
                            iCounter++;
                            if (oSelectedIndices.length === iCounter) {
                                MessageBox.information(msgAlreadyDeleted);
                            }
                        }else if(aData.at(item).CLOSED === true){
                            iCounter++;
                            if (oSelectedIndices.length === iCounter) {
                                MessageBox.information(msgAlreadyClosed);
                            }
                        }
                        else{
                            var PRNo = aData.at(item).PRNO
                            var PRItm = aData.at(item).PRITM
        
                            if(PRNo != "" || PRNo != null){
                                while(PRNo.length < 10) PRNo = "0" + PRNo;
                            }

                            me._oLockData.push({
                                Prno: PRNo,
                                Prln: PRItm
                            });

                            oParamData.push({
                                PreqNo: PRNo,
                                PreqItem: PRItm,
                                DeleteInd: '',
                                CloseInd: 'X'
                            })
                        }
                    }
                    if(await me.prLock(me)){
                        if (oParamData.length > 0) {
                            oParam['N_DelClosePRParam'] = oParamData;
                            oParam['N_DelClosePRReturn'] = [];
                            promiseResult = new Promise((resolve, reject)=>{
                                oModel.create("/DelClosePRSet", oParam, {
                                    method: "POST",
                                    success: function(oResultDCPR, oResponse){
                                        oSelectedIndices.forEach((item, index) => {
                                            
                                            var oRetMsg = oResultDCPR.N_DelClosePRReturn.results.filter(fItem => fItem.PreqNo === aData.at(item).PRNO )//&& fItem.PreqItem === aData.at(item).PRITM);
                                            if (oRetMsg.length > 0) {
                                                if (oRetMsg[0].Type === 'I') {
                                                    message = message + oRetMsg[0].Message + "\n"
                                                }else{
                                                    isError = true;
                                                    message = message + oRetMsg[0].Message + "\n"
                                                }
                                            }else{
                                                isError = true;
                                                message = message + "PR: "+aData.at(item).PRNO + "/" + aData.at(item).PRITM + " "+ msgDeletedOrClosed + "\n"
                                            }
                                            resolve();
                                        });
                                    },error: function(err){
                                        message = message + "Error Encountered! Please try agian! \n"
                                        isError = true;
                                        resolve();
                                    }
                                });

                            });
                            await promiseResult;
                        }
                        if (!isError){
                            await this.getAllData();
                            await this.getDynamicColumns('PRHDR', 'ZDV_3DERP_PR')
                            await this.prUnLock();
                        }
                    }
                    
                }else{
                    message  = msgNoDataToClose;
                }
                Common.closeLoadingDialog(that);
                if(message !== "")
                    MessageBox.information(message);
            }

        },

        onCreateNewStyle: async function(){
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();
            this._router.navTo("ManualPR", {
                SBU: vSBU
            });
        },

        onSaveTableLayout: function () {
            //saving of the layout of table
            var me = this;
            var ctr = 1;
            var oTable = this.getView().byId("styleDynTable");
            var oColumns = oTable.getColumns();
            var vSBU = this.getView().byId("cboxSBU").getSelectedKey();

            var oParam = {
                "SBU": vSBU,
                "TYPE": "PRHDR",
                "TABNAME": "ZDV_3DERP_PR",
                "TableLayoutToItems": []
            };
            
            //get information of columns, add to payload
            oColumns.forEach((column) => {
                oParam.TableLayoutToItems.push({
                    COLUMNNAME: column.sId,
                    ORDER: ctr.toString(),
                    SORTED: column.mProperties.sorted,
                    SORTORDER: column.mProperties.sortOrder,
                    SORTSEQ: "1",
                    VISIBLE: column.mProperties.visible,
                    WIDTH: column.mProperties.width.replace('rem','')
                });

                ctr++;
            });

            //call the layout save
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

            oModel.create("/TableLayoutSet", oParam, {
                method: "POST",
                success: function(data, oResponse) {
                    sap.m.MessageBox.information("Layout saved.");
                    //Common.showMessage(me._i18n.getText('t6'));
                },
                error: function(err) {
                    sap.m.MessageBox.error(err);
                }
            });                
        },

        callCaptionsAPI: async function(){
            var oJSONModel = new JSONModel();
            var oDDTextParam = [];
            var oDDTextResult = [];
            var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

            //SmartFilter Search Label
            oDDTextParam.push({CODE: "SEARCH"});
            oDDTextParam.push({CODE: "SBU"});
            oDDTextParam.push({CODE: "PRNO"});
            oDDTextParam.push({CODE: "DOCTYP"});
            oDDTextParam.push({CODE: "PLANTCD"});
            oDDTextParam.push({CODE: "SHIPTOPLANT"});
            oDDTextParam.push({CODE: "PURGRP"});
            oDDTextParam.push({CODE: "VENDOR"});
            oDDTextParam.push({CODE: "FTYSTYLE"});
            oDDTextParam.push({CODE: "MATGRP"});
            oDDTextParam.push({CODE: "MATTYP"});
            oDDTextParam.push({CODE: "IONO"});
            oDDTextParam.push({CODE: "SEASON"});

            //Button Label
            oDDTextParam.push({CODE: "NEW"});
            oDDTextParam.push({CODE: "EDIT"});
            oDDTextParam.push({CODE: "DELETE"});
            oDDTextParam.push({CODE: "CLOSE"});
            oDDTextParam.push({CODE: "SAVE"});
            oDDTextParam.push({CODE: "CANCEL"});
            oDDTextParam.push({CODE: "SAVELAYOUT"});
            oDDTextParam.push({CODE: "VIEW"});

            //MessageBox
            oDDTextParam.push({CODE: "INFO_NO_LAYOUT"});
            oDDTextParam.push({CODE: "INFO_ALREADY_DELETED"});
            oDDTextParam.push({CODE: "INFO_ERROR"});
            oDDTextParam.push({CODE: "INFO_ALREADY_CLOSED"});
            oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"});
            oDDTextParam.push({CODE: "INFO_NO_DATA_EDIT"});
            oDDTextParam.push({CODE: "INFO_NO_DATA_DELETE"});
            oDDTextParam.push({CODE: "INFO_NO_DATA_CLOSE"});
            oDDTextParam.push({CODE: "INFO_DELETED_OR_CLOSED"});

            await oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                method: "POST",
                success: function(oData, oResponse) {
                    oData.CaptionMsgItems.results.forEach(item=>{
                        oDDTextResult[item.CODE] = item.TEXT;
                    })
                    
                    // console.log(oDDTextResult)
                    oJSONModel.setData(oDDTextResult);
                    that.getView().setModel(oJSONModel, "captionMsg");
                },
                error: function(err) {
                    sap.m.MessageBox.error(err);
                }
            });
        },

        prLock: async (me) => {
            var oModelLock = me.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
            var oParamLock = {};
            var sError = "";
            var boolResult = true;

            await new Promise((resolve, reject) => {
                oParamLock["N_IMPRTAB"] = me._oLockData;
                oParamLock["iv_count"] = 300;
                oParamLock["N_LOCK_MESSAGES"] = []; 

                oModelLock.create("/Lock_PRSet", oParamLock, {
                    method: "POST",
                    success: function(oResultLock) {
                        // console.log("Lock", oResultLock);
                        for(var item of oResultLock.N_LOCK_MESSAGES.results) {
                            if (item.Type === "E") {
                                sError += item.Message + ". ";
                            }
                        }
                        
                        if (sError.length > 0) {
                            boolResult = false;
                            sap.m.MessageBox.information(sError);
                            Common.closeLoadingDialog(me);
                        }
                        else boolResult = true;
                        resolve();
                    },
                    error: function (err) {
                        Common.closeLoadingDialog(me);
                        resolve(false);
                    }
                });
            });
            return boolResult;
        },

        prUnLock() {
            var oModelLock = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
            var oParamUnLock = {};
            var me = this;

            oParamUnLock["N_IMPRTAB"] = this._oLockData;
            oModelLock.create("/Unlock_PRSet", oParamUnLock, {
                method: "POST",
                success: function(oResultLock) {
                    console.log("Unlock", oResultLock)
                },
                error: function (err) {
                    Common.closeLoadingDialog(me);
                }
            })

            this._oLockData = [];
        },
      });
    }
  );
  