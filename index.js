let wcGridTable = require("wc-grid-table/src/wc-grid-table.js");
let debounce = require('lodash.debounce');
let { MarkInput, fetchSelectCheckedValues, fetchCreateTableIfNotExists } = require("./MarkInput");
let { ExportPlugin } = require("wc-grid-table-xlsx-export");

require('./style.css');
// wcGridTable.defineCustomElement()

class ProtTable extends wcGridTable.TableComponent {
    useDefaultOptions() {
        super.useDefaultOptions();

    }

    connectedCallback() {
        super.connectedCallback();

        this.registerPlugin(ExportPlugin);

        let height = this.getAttribute('height');
        let pageSize = this.getAttribute('page-size');

        if (height) this.style.maxHeight = height;
        if (pageSize) {
            // this.pagination.pageSize = Number.parseInt(pageSize);
            // this.options.pagination.pageSize = pageSize;
        } else {
            this.pagination.pageSize = 500;
            // this.options.pagination.pageSize = 500;
        }

        let tabs = document.querySelectorAll('div.tabs div.tab-pane');
        [...tabs].forEach((tab) => {
            tab.addClass = new Proxy(tab.addClass, {
                apply: function(target, thisArg, argList) {
                    console.log('addClass fix-columns');
                    window.postMessage(JSON.stringify({ type: 'fix-columns' }), '*');
                    return target.apply(thisArg, argList);
                }
            })
        })

        // fetch('http://10.19.28.94:5985/ang_prot-wiki/prot-wiki_Legende')
        fetch('https://database.protronic-gmbh.de/query?database=formly', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: `{"query": "SELECT [synonym], [link], [tooltip] FROM schemaAuskunftLinks;"}`
            })
            .then(response => response.json())
            .then(response => {
                let formatterResult = {};
                let links = response.map(entry => {
                    let newEntry = {}
                    newEntry[entry.synonym] = entry.link;
                    return newEntry;
                });
                links.forEach(link => {
                    Object.keys(link).forEach(key => {
                        // let tmp = link[key];
                        if (!formatterResult[key]) {
                            formatterResult[key] = [];
                        }
                        formatterResult[key].push((value) => (value.startsWith('<') ? value : `<a href="${link[key]}${value}">${value}</a>`));
                    });
                });
                console.log(formatterResult);
                this.formatter = formatterResult;
                this.setupProtTableData();
            })
            .catch(err => {
                console.error(err);
                console.log("caught.");
                this.setupProtTableData();
            });

    }

    loadDataFromQuery(query) {
        query = decodeURIComponent(query.replace(/\\n/g, '\n'));

        let fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        };

        fetch('https://database.protronic-gmbh.de/query?database=OLReweAbf', fetchOptions)
            .then(response => response.json())
            .then(jsonResp => {
                console.log(jsonResp);
                this.setupMarkInputs(jsonResp)
                    .then(markData => {
                        markData.forEach(v => delete v.ROWSTAT);
                        this.setData(markData);
                    });
            });
    }

    setupProtTableData() {

        let jsonUrl = this.getAttribute('data_url');
        jsonUrl = jsonUrl.replace(/^[a-zA-Z]*:\/\/[a-zA-Z0-9.-]*/, '');
        let query = this.getAttribute('query');

        if (jsonUrl) {
            fetch(jsonUrl)
                .then(data => data.json())
                .then(data => {
                    this.setupMarkInputs(data)
                        .then(markData => this.setData(markData));
                });
        } else if (query) {
            loadDataFromQuery(query);
        }

        this.setDebounceFn(debounce, [200, { leading: true, trailing: false }], [500, { trailing: true, leading: false }])
    }

    /**
     * Sets up the marker column, but only when all of the required attributes exist.
     * @param {object} data - table data
     * @returns {object} - table data
     */
    async setupMarkInputs(data) {
        const requiredAttributes = {
            identifierField: this.getAttribute('marker-identifierfield'),
            databaseTable: this.getAttribute('marker-databasetable'),
        };

        const optionalAttributes = {
            database: this.getAttribute('marker-database') ? this.getAttribute('marker-database') : "MarkerDB",
            databaseuser: this.getAttribute('marker-databaseuser') ? this.getAttribute('marker-databaseuser') : "wiki",
            markerText: this.getAttribute('marker-markertext'),
        };

        if (Reflect.ownKeys(requiredAttributes).map((key) => requiredAttributes[key]).every((value) => (value == undefined ? false : true))) {
            // console.log(data);
            await fetchCreateTableIfNotExists(optionalAttributes.database, optionalAttributes.databaseuser, requiredAttributes.databaseTable);
            return this.generateMarkInputData(data, requiredAttributes, optionalAttributes);
        } else {
            return data;
        }
    }

    /**
     * Creates a MarkInput element.
     * @param {string} identifierField
     * @param {string} identifierValue
     * @param {string} tablename
     * @param {string} database
     * @param {string} dbuser
     * @param {string} marker
     * @param {boolean} checked
     * @returns {string} - MarkInput outer html
     */
    createMarkInput(identifierField, identifierValue, tablename, database, dbuser, marker, checked) {
        let markInput = document.createElement('mark-input');
        markInput.setAttribute('identifierfield', identifierField);
        markInput.setAttribute('identifiervalue', identifierValue);
        if (tablename) markInput.setAttribute('databasetable', tablename);
        if (database) markInput.setAttribute('database', database);
        if (dbuser) markInput.setAttribute('databaseuser', dbuser);
        if (marker) markInput.setAttribute('markertext', marker);
        if (checked) markInput.toggleAttribute('checked', checked);
        return markInput.outerHTML;
    }

    /**
     * Generates the data for the table, which includes a row with MarkerInputs.
     * @param {object} data - table data
     * @param {{identifierField: string, databaseTable: string}} reqAttr - required MarkInput attributes
     * @param {{database?: string, databaseuser?: string, markerText?: string}} optAttr - optional MarkInput attributes
     * @returns {object} - table data
     */
    async generateMarkInputData(data, reqAttr, optAttr) {
        let { identifierField, databaseTable } = reqAttr;
        let { database, databaseuser, markerText } = optAttr;

        // databaseTable = databaseTable ? databaseTable : "DefaultTable";
        // markerText = markerText ? markerText : "jjj|nnn";

        return fetchSelectCheckedValues(database, databaseuser, databaseTable, identifierField)
            .then((checkedData) => {
                return data.map((entry) => {
                    let checked = checkedData.map((value) => value.identifierValue).includes(entry[identifierField].toString());

                    return {
                        'marker': this.createMarkInput(identifierField, entry[identifierField].toString(), databaseTable, database, databaseuser, markerText, checked),
                        '#markiert': checked ? 'ja' : 'nein',
                        ...entry,
                    };
                });
            });
    }
}

customElements.define('mark-input', MarkInput);
customElements.define('prot-table-v3', ProtTable);

module.exports = {
    ProtTable: ProtTable,
    TableComponent: wcGridTable.TableComponent,
};