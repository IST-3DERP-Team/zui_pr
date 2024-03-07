sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet",
], function (MessageToast, JSONModel, Spreadsheet) {
    "use strict";

    var that = this;

    return {
        onExport: function (oEvent) {
            var oButton = oEvent.getSource();
            var tabName = oButton.data('TableName')

            var tableName = ""
            if(oButton.getParent().getParent().getId().includes("assignVendorTab"))
                tableName = "assignVendorTab";

            var oTable = this.getView().byId(tableName);
            // var oExport = oTable.exportData();

            var aCols = [], aRows, oSettings, oSheet;
            var aParent, aChild;
            var fileName;

            var columns = oTable.getColumns();
            for (var i = 0; i < columns.length; i++) {
                aCols.push({
                    label: columns[i].mProperties.filterProperty,
                    property: columns[i].mProperties.filterProperty,
                    type: 'string'
                })
            }

            var property;
            property = '/rows';
            aRows = oTable.getModel().getProperty(property);
            
            var date = new Date();
            fileName = tableName + " " + date.toLocaleDateString('en-us', { year: "numeric", month: "short", day: "numeric" });

            oSettings = {
                fileName: fileName,
                workbook: { columns: aCols },
                dataSource: aRows
            };

            oSheet = new Spreadsheet(oSettings);
            oSheet.build()
            .then(function () {
                MessageToast.show('Spreadsheet export has finished');
            })
            .finally(function () {
                oSheet.destroy();
            });
        }

    };
});