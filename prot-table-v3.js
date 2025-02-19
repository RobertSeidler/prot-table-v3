(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// const { ProtTable, TableComponent } = require('./index');

// /**
//  * @typedef {import('./index').TableComponent} TableComponent
//  * @typedef {import('./index').ProtTable} ProtTable
//  */

/**
 * Header for fetch requests to the db-interface. Content-Type needs to be "application/json".
 */
const header = {
    'Content-Type': 'application/json'
};

/**
 * Creates the body for the fetch request to the db-interface.
 * @param {() => string} queryFn - callback, that generates the query, by substituting the required information into a query template.
 * @returns {string} - the stringified json body
 */
const createFetchBody = (queryFn) => JSON.stringify({ query: queryFn() });

// const insertQuery = (artikelnummer) => `INSERT INTO InventurCurrentRecount (Artikelnummer) VALUES ('${artikelnummer}');`;
// const deleteQuery = (artikelnummer) => `DELETE FROM InventurCurrentRecount WHERE Artikelnummer = '${artikelnummer}';`;

/**
 * Creates the database-interface link for a given databasename and username.
 * @param {string} database - database name 
 * @param {string} username - database username 
 * @returns 
 */
const databaseUrl = (database, username) => `https://database.protronic-gmbh.de/query?database=${database}&username=${username}`;

/** 
 * A query to create the table, if it does not exist yet. 
 * @param {string} databaseTable - name of the table 
 * @returns {string} - the query to be send to the db
 */
const createTableQuery = (databaseTable) => `IF NOT EXISTS (SELECT * FROM sys.tables WHERE sys.tables.name = '${databaseTable}') CREATE TABLE ${databaseTable}(identifierField NVARCHAR(MAX), identifierValue NVARCHAR(MAX));`;

/**
 * A query to get all identifierValues from a given databaseTable.
 * @param {*} databaseTable - name of the table 
 * @param {*} identifierField - the name of the primary-key-field
 * @returns {string} - the query to be send to the db
 */
const selectCheckedForAll = (databaseTable, identifierField) => `SELECT [identifierValue] FROM ${databaseTable} WHERE [identifierField] = '${identifierField}' GROUP BY [identifierValue];`;

/**
 * A query to insert values into the databaseTable. Marked Values are saved to db, unmarked ones are not.
 * @param {string} databaseTable - name of the table
 * @param {string} identifierField - the name of the primary-key-field
 * @param {string} identifierValue - the value (of table.data) for this row. (identifierValue = table.data[row][identifierField])
 * @returns {string} - the query to be send to the db
 */
const insertQuery = (databaseTable, identifierField, identifierValue) => `INSERT INTO ${databaseTable} (identifierField, identifierValue) VALUES ('${identifierField}', '${identifierValue}');`;

/**
 * A query to delete all values from the table, which have matching identifier-fields and -values.
 * @param {string} databaseTable - name of the table
 * @param {string} identifierField - the name of the primary-key-field
 * @param {string} identifierValue - the value (of table.data) for this row. (identifierValue = table.data[row][identifierField])
 * @returns {string} - the query to be send to the db
 */
const deleteQuery = (databaseTable, identifierField, identifierValue) => `DELETE FROM ${databaseTable} WHERE identifierField = '${identifierField}' AND identifierValue = '${identifierValue}';`;

/**
 * Sanitizes user controlled input for use in sql queries. TODO: needs to be implemented on the server.
 * @param {string} sql - unsanitized sql input
 * @returns {string} - sanitized sql input
 */
function sanitizeSql(sql) { throw new Error('unimplemented function'); }

/**
 * Searches for the closest ancestor element, that is a wc-grid-table or extends from it.
 * @param {HTMLElement} element
 * @returns {undefined|HTMLElement} - the closest ancestor element, that is a wc-grid-table
 */
function searchParentTable(element) {
    let currentElement = element;
    while (true) {
        currentElement = currentElement.parentElement;
        if (currentElement.nodeName.toLowerCase() == 'body') {
            return undefined;
        } else if (currentElement.nodeName.toLowerCase() == 'prot-table-v3' || currentElement.nodeName.toLowerCase() == 'wc-grid-table') {
            return currentElement;
        }
    }
}

class MarkInput extends HTMLElement {
    /**
     * Lifehook of webcomponents, that is called, when the component has loaded. 
     */
    connectedCallback() {
        // super.connectedCallback();

        /**
         * A store for Values that are meant to be set by this elements attributes.
         */
        this.dataAttributes = {
            /**
             * The table field, that is used as primary key. Attribute "identifierfield" required!
             */
            IdentifierField: this.getAttribute('identifierfield'),

            /**
             * The table value of the data.IdentifierField for this row. Can be set by adding the "identifierfield" attribute. The "identifierfield" attribute is required! 
             */
            IdentifierValue: this.getAttribute('identifiervalue'),

            /**
             * The database in SQLServer, where the DatabaseTable is supposed to be. Can be set via the "database" attribute and is optional (default: "MarkerDB"). 
             */
            Database: this.getAttribute('database') ? this.getAttribute('database') : "MarkerDB",

            /**
             * The database user, that is used for saving data to the db. Is set by the "databaseuser" attribute, which is optional (default: "wiki")!
             */
            DatabaseUser: this.getAttribute('databaseuser') ? this.getAttribute('databaseuser') : "wiki",

            /**
             * The tablename for SQLServer, where the marked values are saved. The attribute "databaseTable" is not absolutly required, but the default table is only a fallback and it should not be used (default: "DefaultTable")!
             */
            DatabaseTable: this.getAttribute('databasetable') ? this.getAttribute('databasetable') : "DefaultTable",

            /**
             * When the html attribute "checked" is set, the checkbox is marked. Optional (default: false)!
             */
            IsChecked: this.hasAttribute('checked'),

            /**
             * The text, which is added to the checkbox, so that it can be filtered with table. MarkerText needs to be a string with "|" as separetor character. Left value is for checked, right for unchecked. Optional (default: "-1|0") 
             */
            // MarkerText: this.getAttribute('markertext') ? this.getAttribute('markertext') : "true|false",
            MarkerText: "true|false",
        };

        /**
         * A store for values, that are determined automatically or dependent on those set in dataAttributes.
         */
        this.dataProperties = {
            /**
             * The prot-table with is the closest ancestor of this element.  
             */
            ParentTable: searchParentTable(this),

            /**
             * The url for the database that is set in "dataAttributes.Database".
             */
            DatabaseUrl: databaseUrl(this.dataAttributes.Database, this.dataAttributes.DatabaseUser),

            /**
             * The query for creating the table (if it doesn't exist). 
             */
            CreateTableQuery: createTableQuery.bind(this, this.dataAttributes.DatabaseTable),

            /**
             * The query for inserting data into the table.
             */
            InsertValuesQuery: insertQuery.bind(this, this.dataAttributes.DatabaseTable, this.dataAttributes.IdentifierField, this.dataAttributes.IdentifierValue),

            /**
             * The query for deleting data from the table.
             */
            DeleteFromQuery: deleteQuery.bind(this, this.dataAttributes.DatabaseTable, this.dataAttributes.IdentifierField, this.dataAttributes.IdentifierValue),
        };

        /**
         * A store for elements used in this component.
         */
        this.dataElements = {
            /**
             * The checkbox, which displays the current state of "dataAttributes.IsChecked".
             */
            CheckboxInput: document.createElement('input'),

            /**
             * The span element, which has table filterable, invisible text inside.
             */
            FilterTextSpan: document.createElement('span'),
        };

        // console.log(`checked: ${this.dataAttributes.IsChecked}`);

        if (this.dataAttributes.IsChecked) this.setChecked(false);
        else this.unsetChecked();

        this.setupMarkInputElement();
        this.createCheckboxInput();
        this.createFilterElement();
    }

    setupMarkInputElement() {
        this.classList.add(`marker_${this.dataAttributes.IdentifierValue}`);
    }

    /**
     * Create the checkbox input and add it to this Components HTML Context.
     */
    createCheckboxInput() {
        this.dataElements.CheckboxInput.type = 'checkbox';
        this.dataElements.CheckboxInput.onclick = this.clickEventHandler.bind(this);
        if (this.dataAttributes.IsChecked) this.dataElements.CheckboxInput.toggleAttribute('checked', true);
        this.append(this.dataElements.CheckboxInput);
    }

    /**
     * Create the span, that is used to filter and sort marked data.
     */
    createFilterElement() {
        let [markedText, unmarkedText] = this.dataAttributes.MarkerText.split('|');
        this.dataElements.FilterTextSpan.style.display = 'none';
        this.dataElements.FilterTextSpan.textContent = this.dataAttributes.IsChecked ? markedText : unmarkedText;
        this.append(this.dataElements.FilterTextSpan);
    }

    /**
     * Change all necassarry values, when the status of IsChecked changes to true.
     * @param {boolean} updateTable - true means the rest of the table is getting an setChecked(false) call.
     */
    setChecked(updateTable) {
        let [setMarker, unsetMarker] = this.dataAttributes.MarkerText.split('|');
        this.dataAttributes.IsChecked = true;
        this.toggleAttribute('checked', true);
        // this.toggleAttribute(setMarker, true);
        // this.removeAttribute(unsetMarker)
        this.dataElements.CheckboxInput.toggleAttribute('checked', true);
        // this.dataElements.CheckboxInput.toggleAttribute(setMarker, true);
        // this.dataElements.CheckboxInput.removeAttribute(setMarker);
        this.dataElements.CheckboxInput.checked = true;
        this.dataElements.FilterTextSpan.textContent = setMarker;
        // if (updateTable) this.dataProperties.ParentTable.data.filter((entry) => (console.log(entry['marker']), entry[this.dataAttributes.IdentifierField] == this.dataAttributes.IdentifierValue)).map(entry => (entry['marker'].setChecked(false)));
        if (updateTable) {
            document.querySelectorAll(`.table-id-${this.dataProperties.ParentTable.tableId} mark-input.marker_${this.dataAttributes.IdentifierValue}`).forEach((marker) => (marker.setChecked(false)));
            this.setMarkierenData(true);
        }
        // this.parentElement.nextElementSibling.textContent = 'ja';
        this.setMarkiertField(true);
    }

    /**
     * Change all necassarry values, when the status of IsChecked changes to false.
     * @param {boolean} updateTable - true means the rest of the table is getting an setChecked(false) call.
     */
    unsetChecked(updateTable) {
        let [setMarker, unsetMarker] = this.dataAttributes.MarkerText.split('|');
        this.dataAttributes.IsChecked = false;
        this.removeAttribute('checked');
        // this.toggleAttribute(unsetMarker);
        // this.removeAttribute(setMarker);
        this.dataElements.CheckboxInput.removeAttribute('checked');
        // this.dataElements.CheckboxInput.toggleAttribute(unsetMarker);
        // this.dataElements.CheckboxInput.removeAttribute(setMarker);
        this.dataElements.CheckboxInput.checked = false;
        this.dataElements.FilterTextSpan.textContent = unsetMarker;
        // if (updateTable) this.dataProperties.ParentTable.data.filter((entry) => (entry[this.dataAttributes.IdentifierField] == this.dataAttributes.IdentifierValue)).map(entry => (entry[this.dataAttributes.IdentifierField].unsetChecked(false)));
        if (updateTable) {
            document.querySelectorAll(`.table-id-${this.dataProperties.ParentTable.tableId} mark-input.marker_${this.dataAttributes.IdentifierValue}`).forEach((marker) => (marker.unsetChecked(false)));
            this.setMarkierenData(false);
        }
        this.setMarkiertField(false);
    }

    setMarkierenData(bool) {
        this.dataProperties.ParentTable.data = this.dataProperties.ParentTable.data.map(entry => {
            if (entry[this.dataAttributes.IdentifierField] == this.dataAttributes.IdentifierValue) {
                entry['#markiert'] = bool ? 'ja' : 'nein';
                entry['marker'] = this.dataProperties.ParentTable.createMarkInput(
                    this.dataAttributes.IdentifierField,
                    this.dataAttributes.IdentifierValue,
                    this.dataAttributes.DatabaseTable,
                    this.dataAttributes.Database,
                    this.dataAttributes.DatabaseUser,
                    this.dataAttributes.MarkerText,
                    bool
                );
            }
            return entry;
        });
    }

    setMarkiertField(bool) {
        let nextSibling = this.parentElement.nextElementSibling;
        if (nextSibling && nextSibling.classList.contains('wgt-column_#markiert')) {
            nextSibling.textContent = bool ? 'ja' : 'nein';
        }
    }

    /**
     * Create the table in SQLServer, if it doesn't already exist.
     */
    createTable() {
        console.log(this.dataProperties.CreateTableQuery());
        fetch(this.dataProperties.DatabaseUrl, {
                method: 'POST',
                headers: header,
                body: createFetchBody(this.dataProperties.CreateTableQuery),
            })
            .then(response => response.json())
            .then(data => {
                // console.log(data);
                console.log('finished table create query.');
            });
    }

    /**
     * Handles the click event on the checkbox element.
     * @param {ClickEvent} event 
     */
    clickEventHandler(event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.dataAttributes.IsChecked) {
            console.log(this.dataProperties.DeleteFromQuery());
            fetch(this.dataProperties.DatabaseUrl, {
                    method: 'POST',
                    headers: header,
                    body: createFetchBody(this.dataProperties.DeleteFromQuery),
                })
                .then(response => response.json())
                .then(data => {
                    // console.log(data);
                    this.unsetChecked(true);
                });
        } else {
            console.log(this.dataProperties.InsertValuesQuery());
            fetch(this.dataProperties.DatabaseUrl, {
                    method: 'POST',
                    headers: header,
                    body: createFetchBody(this.dataProperties.InsertValuesQuery),
                })
                .then(response => response.json())
                .then(data => {
                    // console.log(data);
                    this.setChecked(true);
                });
        }
    }
}

/**
 * Fetches the list of checked values.
 * @param {string} db - database name
 * @param {string} dbuser - database user
 * @param {string} dbTable - database table
 * @param {string} idField - identifier field
 * @returns {Promise<any>} - a promise of the received json list 
 */
async function fetchSelectCheckedValues(db, dbuser, dbTable, idField) {
    return fetch(databaseUrl(db, dbuser), {
            method: 'POST',
            headers: header,
            body: createFetchBody(selectCheckedForAll.bind(this, dbTable, idField)),
        })
        .then(response => (response.json()))
        .then(data => {
            return data;
        });
}

async function fetchCreateTableIfNotExists(db, dbuser, dbTable) {
    return fetch(databaseUrl(db, dbuser), {
            method: 'POST',
            headers: header,
            body: createFetchBody(createTableQuery.bind(this, dbTable)),
        })
        .then(response => (response.json()))
        .then(data => {
            return data;
        });
}

// customElements.define('mark-input', MarkInput);

module.exports = {
    MarkInput,
    fetchSelectCheckedValues,
    fetchCreateTableIfNotExists,
};
},{}],2:[function(require,module,exports){
let wcGridTable = require("wc-grid-table/src/wc-grid-table.js");
let debounce = require('lodash.debounce');
let { MarkInput, fetchSelectCheckedValues, fetchCreateTableIfNotExists } = require("./MarkInput");

require('./style.css');
// wcGridTable.defineCustomElement()

class ProtTable extends wcGridTable.TableComponent {
    useDefaultOptions() {
        super.useDefaultOptions();

    }

    connectedCallback() {
        super.connectedCallback();

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
},{"./MarkInput":1,"./style.css":12,"lodash.debounce":4,"wc-grid-table/src/wc-grid-table.js":11}],3:[function(require,module,exports){
'use strict';
// For more information about browser field, check out the browser field at https://github.com/substack/browserify-handbook#browser-field.

var styleElementsInsertedAtTop = [];

var insertStyleElement = function(styleElement, options) {
    var head = document.head || document.getElementsByTagName('head')[0];
    var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];

    options = options || {};
    options.insertAt = options.insertAt || 'bottom';

    if (options.insertAt === 'top') {
        if (!lastStyleElementInsertedAtTop) {
            head.insertBefore(styleElement, head.firstChild);
        } else if (lastStyleElementInsertedAtTop.nextSibling) {
            head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
        } else {
            head.appendChild(styleElement);
        }
        styleElementsInsertedAtTop.push(styleElement);
    } else if (options.insertAt === 'bottom') {
        head.appendChild(styleElement);
    } else {
        throw new Error('Invalid value for parameter \'insertAt\'. Must be \'top\' or \'bottom\'.');
    }
};

module.exports = {
    // Create a <link> tag with optional data attributes
    createLink: function(href, attributes) {
        var head = document.head || document.getElementsByTagName('head')[0];
        var link = document.createElement('link');

        link.href = href;
        link.rel = 'stylesheet';

        for (var key in attributes) {
            if ( ! attributes.hasOwnProperty(key)) {
                continue;
            }
            var value = attributes[key];
            link.setAttribute('data-' + key, value);
        }

        head.appendChild(link);
    },
    // Create a <style> tag with optional data attributes
    createStyle: function(cssText, attributes, extraOptions) {
        extraOptions = extraOptions || {};

        var style = document.createElement('style');
        style.type = 'text/css';

        for (var key in attributes) {
            if ( ! attributes.hasOwnProperty(key)) {
                continue;
            }
            var value = attributes[key];
            style.setAttribute('data-' + key, value);
        }

        if (style.sheet) { // for jsdom and IE9+
            style.innerHTML = cssText;
            style.sheet.cssText = cssText;
            insertStyleElement(style, { insertAt: extraOptions.insertAt });
        } else if (style.styleSheet) { // for IE8 and below
            insertStyleElement(style, { insertAt: extraOptions.insertAt });
            style.styleSheet.cssText = cssText;
        } else { // for Chrome, Firefox, and Safari
            style.appendChild(document.createTextNode(cssText));
            insertStyleElement(style, { insertAt: extraOptions.insertAt });
        }
    }
};

},{}],4:[function(require,module,exports){
(function (global){(function (){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = debounce;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
var murmur3 = require("./murmurhash3_gc.js")
var murmur2 = require("./murmurhash2_gc.js")

module.exports = murmur3
module.exports.murmur3 = murmur3
module.exports.murmur2 = murmur2

},{"./murmurhash2_gc.js":6,"./murmurhash3_gc.js":7}],6:[function(require,module,exports){
/**
 * JS Implementation of MurmurHash2
 * 
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * 
 * @param {string} str ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */

function murmurhash2_32_gc(str, seed) {
  var
    l = str.length,
    h = seed ^ l,
    i = 0,
    k;
  
  while (l >= 4) {
  	k = 
  	  ((str.charCodeAt(i) & 0xff)) |
  	  ((str.charCodeAt(++i) & 0xff) << 8) |
  	  ((str.charCodeAt(++i) & 0xff) << 16) |
  	  ((str.charCodeAt(++i) & 0xff) << 24);
    
    k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    k ^= k >>> 24;
    k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));

	h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

    l -= 4;
    ++i;
  }
  
  switch (l) {
  case 3: h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
  case 2: h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
  case 1: h ^= (str.charCodeAt(i) & 0xff);
          h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
  }

  h ^= h >>> 13;
  h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
  h ^= h >>> 15;

  return h >>> 0;
}

if(typeof module !== undefined) {
  module.exports = murmurhash2_32_gc
}

},{}],7:[function(require,module,exports){
/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 * 
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * 
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash 
 */

function murmurhash3_32_gc(key, seed) {
	var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;
	
	remainder = key.length & 3; // key.length % 4
	bytes = key.length - remainder;
	h1 = seed;
	c1 = 0xcc9e2d51;
	c2 = 0x1b873593;
	i = 0;
	
	while (i < bytes) {
	  	k1 = 
	  	  ((key.charCodeAt(i) & 0xff)) |
	  	  ((key.charCodeAt(++i) & 0xff) << 8) |
	  	  ((key.charCodeAt(++i) & 0xff) << 16) |
	  	  ((key.charCodeAt(++i) & 0xff) << 24);
		++i;
		
		k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

		h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
		h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
		h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
	}
	
	k1 = 0;
	
	switch (remainder) {
		case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
		case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
		case 1: k1 ^= (key.charCodeAt(i) & 0xff);
		
		k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
		h1 ^= k1;
	}
	
	h1 ^= key.length;

	h1 ^= h1 >>> 16;
	h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
	h1 ^= h1 >>> 13;
	h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
	h1 ^= h1 >>> 16;

	return h1 >>> 0;
}

if(typeof module !== "undefined") {
  module.exports = murmurhash3_32_gc
}
},{}],8:[function(require,module,exports){
/**
 * Transform the filter input into a RegExp, to let the user have a powerfull way to filter in the table.
 * Only rows where the tested value matches the RegExp, get displayed. 
 * Additionally you can prepend three exclamation marks ('!!!') to negate the RegExp, so that only rows that
 * don't match the RegExp are displayed. This is the default filter function.
 * This function can be replaced by supplying your own functions to TableComponent.filterOperations.
 * 
 * @param {string} filterInput the value of the filter text input field.
 * @param {string} testValue the table value to validate against.
 */
function regexFilter(negate, filterInput, testValue){
  // let negate = filterInput.substring(0, 3) === '!!!';
  // filterInput = negate ? filterInput.substring(3) : filterInput;
  let result = false;
  if(testValue != undefined){
    let matches = testValue.toString().match(new RegExp(filterInput, 'i'));
    result = Boolean(matches) && matches.length > 0;
  }
  return negate ? !result : result;
}
  
/**
 * Test the filter input string with includes (case is ignored) against the table value.
 * Only rows where the filter input is a substring of the tested value.
 * Additionally you can prepend three exclamation marks ('!!!') to negate the outcome, 
 * so that only rows that are not included in the table value are displayed.
 * This function can replace regexFilter by supplying it to TableComponent.filterOperations or overwriting
 * regexFilter before use.
 * 
 * @param {string} filterInput the value of the filter text input field.
 * @param {string} testValue the table value to validate against.
 */
function textFilter(negate, filterInput, testValue){
  // let negate = filterInput.substring(0, 3) === '!!!';
  // filterInput = negate ? filterInput.substring(3) : filterInput;
  let result = false;
  if(testValue != undefined){
    result = testValue.toString().toUpperCase().includes(filterInput.toUpperCase());
  }
  return negate ? !result : result;
}

function compareFilter(operation, filterInput, testValue){
  let result = false;
  if(testValue != undefined){
    try{
      result = operation(Number.parseFloat(filterInput), Number.parseFloat(testValue));
    } catch (err){
      result = operation(filterInput.toString(), testValue.toString());
    }
  }
  return result;
}

module.exports = {regexFilter, textFilter, compareFilter};
},{}],9:[function(require,module,exports){
function getFrameStartEnd(currentPage, totalPages) {
    let start = currentPage - 2;
    let end = currentPage + 2;

    if (currentPage >= totalPages - 1) {
        end = totalPages;
        start = totalPages < 5 ? 1 : totalPages - 4;
    } else if (currentPage <= 2) {
        end = totalPages < 5 ? totalPages : 5;
        start = 1;
    }

    return { start: start, end: end };
}

function changePageTo(table, targetPage) {
    table.pagination.currentPage = targetPage;
    table.serializeLinkOptions();
    table.redrawData();
}

function onPageChangeKey(table, event) {
    if (event.keyCode == 37) {
        changePageTo(table, table.pagination.currentPage > 1 ? table.pagination.currentPage - 1 : 1)
            //table.pagination.currentPage = table.pagination.currentPage > 1 ? table.pagination.currentPage - 1 : 1;
            //table.redrawData();
    } else if (event.keyCode == 39) {
        changePageTo(table, table.pagination.currentPage < table.pagination.totalPages ? table.pagination.currentPage + 1 : table.pagination.totalPages);
        //table.pagination.currentPage = table.pagination.currentPage < table.pagination.totalPages ? table.pagination.currentPage + 1 : table.pagination.totalPages;
        //table.redrawData();
    }
}

function clickHandlerDocument(table, event) {
    let keyChangeListener = onPageChangeKey.bind(null, table);

    document.removeEventListener('keyup', keyChangeListener);

    if (table.elements.pageChooser == event.target || table.elements.pageChooser == event.target.parentNode) {
        document.addEventListener('keyup', keyChangeListener);
        table.elements.pageChooser.classList.add('selected');
    } else {
        if (table && table.elements.pageChooser) table.elements.pageChooser.classList.remove('selected');
    }
}

let clickHandlerBoundCall = undefined;

function addKeyHandlerToDocument(table) {
    if (!clickHandlerBoundCall) clickHandlerBoundCall = clickHandlerDocument.bind(null, table);
    document.removeEventListener('click', clickHandlerBoundCall);
    document.addEventListener('click', clickHandlerBoundCall);
}

function createPageChooser(table, data) {
    let element = document.createElement('div');
    let currentPage = table.pagination.currentPage;
    let totalPages = table.pagination.totalPages;
    if (table.pagination.active) {
        element.classList.add('page-chooser', 'wgt-pagination');
        let front_disabled = currentPage == 1
        let back_disabled = currentPage == totalPages;
        element.append(createPageChooserChild('<<', table, 1, false, front_disabled));
        element.append(createPageChooserChild('<', table, currentPage - 1, false, front_disabled));
        let { start, end } = getFrameStartEnd(currentPage, totalPages);
        for (let i = start; i <= end; i++) {
            if (currentPage == i) {
                element.append(createPageChooserChild(i.toString(), table, i, true));
            } else {
                element.append(createPageChooserChild(i.toString(), table, i));
            }
        }
        element.append(createPageChooserChild('>', table, currentPage + 1, false, back_disabled));
        element.append(createPageChooserChild('>>', table, totalPages, false, back_disabled));
    }
    return element;
}

function createPageChooserChild(content, table, targetPage, isCurrent, isDisabled) {
    let element = document.createElement('div');
    element.innerHTML = content;
    element.classList.add('page-change', 'wgt-pagination');
    if (isCurrent) {
        element.classList.add('active-page');
    } else {
        if (isDisabled) {
            element.classList.add('page-change-disabled');
        } else {
            element.addEventListener('click', (event) => {
                changePageTo(table, targetPage)
                    //table.pagination.currentPage = targetPage;
                    //table.redrawData();
            });
        }
    }
    return element;
}

module.exports = {
    getFrameStartEnd,
    createPageChooser,
    createPageChooserChild,
    addKeyHandlerToDocument,
    changePageTo,
}
},{}],10:[function(require,module,exports){
var css = "/* body {\r\n  font: arial, sans-serif;\r\n} */\n.wgt-grid-container {\n  display: grid;\n  position: static;\n  max-width: min-content;\n  max-height: 500px;\n  overflow-y: scroll;\n  background: lightgray;\n  /* grid-gap: 1px; */\n  /* grid-row-gap: 2px; */\n  grid-column-gap: 2px;\n  border: 1px solid lightgray;\n}\n.header-col-tooltip {\n  position: absolute;\n  font-weight: bold;\n  border: 1px solid lightgray;\n  border-right: 1px dotted lightgray;\n  pointer-events: none;\n  z-index: 99;\n  visibility: hidden;\n  margin: -1px;\n}\n.header-col-tooltip.visible {\n  visibility: visible;\n}\n.wgt-header {\n  font-weight: bold;\n  position: sticky;\n  box-sizing: border-box;\n  top: 0px;\n  border-bottom: 1px solid lightgray;\n  overflow-y: hidden;\n}\n.wgt-header>div.arrow {\n  /* visibility: hidden; */\n  color: lightgray;\n  width: 1em;\n  position: absolute;\n  font-weight: bold;\n  top: 0px;\n  bottom: 0px;\n  right: 0px;\n  padding-right: 5px;\n  margin-top: auto;\n  margin-bottom: auto;\n  font-family: monospace;\n  font-size: large;\n  vertical-align: middle;\n  padding-top: 5px;\n  padding-bottom: 5px;\n  cursor: pointer;\n  -moz-user-select: text;\n  background: white;\n  text-align: center;\n  transform: scale(1, 2)translate(20%, 13%);\n}\n.wgt-col-header-container {\n  width: 1em;\n  overflow-x: visible;\n}\n.wgt-filter_cell {\n  position: sticky;\n  top: 0px;\n  background: white;\n  box-sizing: border-box;\n  width: 100%;\n  height: 2em;\n  text-align: center;\n  vertical-align: middle;\n  font-size: 1rem;\n  border-bottom: 1px solid lightgray;\n  box-shadow: inset 1px 1px 5px 0px lightgrey;\n  padding-top: 5px;\n  padding-bottom: 5px;\n  margin-top: auto;\n  margin-bottom: auto;\n}\n.filter_input {\n  position: absolute;\n  top: 0px;\n  left: 0px;\n  bottom: 0px;\n  right: 0px;\n  margin-top: auto;\n  margin-bottom: auto;\n  padding-top: 5px;\n  padding-bottom: 5px;\n}\n.filter_negator {\n  position: absolute;\n  font-weight: bold;\n  top: 0px;\n  bottom: 0px;\n  left: 0px;\n  padding-left: 5px;\n  margin-top: auto;\n  margin-bottom: auto;\n  font-family: monospace;\n  font-size: 1em;\n  vertical-align: middle;\n  padding-top: 5px;\n  padding-bottom: 5px;\n  cursor: pointer;\n}\n.wgt-cell {\n  box-sizing: border-box;\n  font-size: 1rem;\n  padding-left: 20px;\n  padding-right: 20px;\n  padding-top: 10px;\n  padding-bottom: 10px;\n  background: white;\n  /* border: 2px solid lightgray; */\n  overflow-x: hidden;\n}\n.wgt-data-cell {\n  max-width: 500px;\n}\n.wgt-header.wgt-cell {\n  padding-right: 30px;\n}\n.wgt-zebra_1 {\n  background: white;\n}\n.wgt-zebra_0 {\n  background: rgb(230, 230, 230);\n}\n.wgt-footer {\n  display: grid;\n  position: sticky;\n  bottom: 0px;\n  background: white;\n  border-top: 1px solid lightgray;\n  grid-template-rows: 1fr;\n  grid-template-columns: repeat(4, fit-content(300px)) 1fr;\n}\n.footer-button {\n  position: relative;\n  border: 1px solid rgba(27, 31, 35, .2);\n  /* border-radius: .25em; */\n  width: max-content;\n  overflow: visible;\n  cursor: pointer;\n  background-color: #eff3f6;\n  background-image: linear-gradient(-180deg, #fafbfc, eff3f6, 90%);\n  background-repeat: repeat-x;\n  background-position: -1px -1px;\n  background-size: 110% 110%;\n  -webkit-appearance: none;\n  -moz-appearance: none;\n  appearance: none;\n  user-select: none;\n}\n.footer-button:hover {\n  box-shadow: inset 0px 0px 20px 2px rgba(0, 0, 0, 0.2);\n}\n.footer-button-down:after {\n  display: inline-block;\n  width: 0px;\n  height: 0px;\n  vertical-align: -2px;\n  content: \"\";\n  border: 4px solid transparent;\n  border-top-color: currentcolor;\n}\n.column-chooser-menu-container {\n  /* position: absolute; */\n  position: relative;\n  width: 200px;\n  height: min-content;\n  /* top: 0px; */\n  /* bottom: 0px; */\n  left: 0px;\n  /* right: 0px; */\n  /* background-color: rgba(0,0,0,.5); */\n  z-index: 99;\n  visibility: visible;\n}\n.column-chooser-menu {\n  margin-top: auto;\n  margin-bottom: auto;\n  overflow: hidden;\n  color: black;\n  border: 1px solid rgba(100, 100, 100, 0.5);\n  border-radius: 5px;\n  list-style: none;\n  padding-left: 0px;\n  background-color: lightgray;\n  box-shadow: 1px 2px 10px 2px rgba(0, 0, 0, 0.2);\n}\n.column-chooser-menu-container.hidden {\n  visibility: hidden;\n  height: 0px;\n}\n.column-chooser-item {\n  background-color: white;\n  /* border-radius: 5px; */\n  margin-top: 1px;\n  user-select: none;\n  white-space: nowrap;\n}\n.column-chooser-item:first-child {\n  margin-top: 0px;\n}\n.column-chooser-item:hover {\n  background-color: lightblue;\n  box-sizing: border-box;\n  background-clip: padding-box;\n  border-radius: 5px;\n}\n.column-chooser-item>label {\n  display: block;\n  cursor: pointer;\n  padding: 5px 20px 5px 5px;\n}\n.page-chooser {\n  display: grid;\n  grid-template-rows: auto;\n  grid-template-columns: repeat(9, auto);\n  font-family: monospace;\n  grid-column: -1;\n  border-left: none;\n  position: sticky;\n  right: 0px;\n}\n.page-chooser.selected {\n  border-left: 1px dotted gray;\n}\n.page-change {\n  margin-top: auto;\n  margin-bottom: auto;\n  padding-left: 5px;\n  padding-right: 5px;\n}\n.page-change:first-child {\n  margin-top: auto !important;\n}\n.page-change:not(.page-change-disabled) {\n  cursor: pointer;\n}\n.page-change-disabled {\n  color: gray;\n}\n.active-page {\n  font-weight: bold;\n}\n.wgt-footer_cell {\n  border-right: 1px solid lightgray;\n  width: max-content;\n}\n@-moz-document url-prefix()  {\n  .wgt-grid-container div:nth-last-child(2).wgt-data-cell {\n    height: 200%;\n  }\n\n  .filter_negator {\n    font-size: 1em;\n  }\n}\n"; (require("browserify-css").createStyle(css, { "href": "node_modules\\wc-grid-table\\src\\wc-grid-table.css" }, { "insertAt": "bottom" })); module.exports = css;
},{"browserify-css":3}],11:[function(require,module,exports){
//? FEATURE: maybe add possibility for horizontal header either
//? Top -> Down - css: { writing-mode: sideways-rl, text-orientation : sideways } or
//? Bottom -> Up - css: { writing-mode: sideways-lr, text-orientation : sideways }


/**
 * Project: wc-grid-table
 * Repository: https://github.com/RobertSeidler/wc-grid-table
 * Auther: Robert Seidler
 * Email: Robert.Seidler1@googlemail.com 
 * License: ISC
 */

require('./wc-grid-table.css');

// test exception tracker with an actual module.
//TODO: Comment out before packaging
let appname = 'wc-grid-table';
// let tracker = require('../../exception-tracker-server/test-client/tracker.js')
//   .Tracker
//   .injectConsole('http://localhost:52005/', 'wc-grid-table', true, true, true);


const { regexFilter, textFilter, compareFilter } = require('./filter-utils.js');
const { createPageChooser, addKeyHandlerToDocument } = require('./pagination-utils.js');
const murmur = require("murmurhash-js");

var tableCounter = 0;

module.exports = (function() {
            // Closure, so that only functions I want to expose are getting exposed.

            function defineSetPrototypeFunctions() {
                /**
                 * @param {Iterable} an iterable, that should be unioned with the starting Set
                 */
                Object.defineProperty(Set.prototype, 'union', {
                    value: function(anotherSet) {
                        for (let element of anotherSet) {
                            this.add(element);
                        }
                        return this;
                    },
                    enumerable: false,
                    writable: true,
                });
            }

            const testNumberRegex = /^(-{0,1}[0-9]{1,3}(?:[\.|,]{0,1}[0-9]{3})*[\.|\,]{0,1}[0-9]*)\s{0,1}\D*$/i;

            function fixColumnHeader(table, col_height) {
                table.header.forEach((column) => {
                    let col_header = table.elements.header[column];
                    col_height = col_header.offsetHeight;
                    if (col_header.offsetHeight > 0)
                        table.elements.stickyStyle.innerHTML = `
                          .table-id-${table.tableId} > .wgt-filter_cell {
                            top: ${col_header.offsetHeight}px;
                          }
                        `;
                });
            }

            /**
             * Tests if a value is a number, by matching against a Regex. 
             * On success the the parsed number is returned. 
             * On undefined an empty String is returned.
             * Otherwise the testStr is returned unparsed. 
             * @param {String} testStr 
             * @returns {String | Number} 
             */
            function tryTransformToNumber(testStr) {
                if (testStr == undefined) return "";
                let matches = testNumberRegex.exec(testStr.toString());
                let result;
                if (matches) {
                    result = Number.parseFloat(matches[1]);
                } else {
                    result = testStr;
                }
                return result;
            }

            /**
             * Compare function for comparing numbers for sorting. Additionally undefined values are 
             * always the 'smaller' value, so that they get sorted to the bottom.
             * Can be replaced by supplying a custom compare function to TableComponent.customCompareNumbers.
             * 
             * @param {number} a number to compare. 
             * @param {number} b number to compare.
             */
            function compareNumbers(a, b) {
                if (a == undefined || a === '') return 1;
                if (b == undefined || b === '') return -1;
                return tryTransformToNumber(b) - tryTransformToNumber(a);
            }

            /**
             * Compare function for comparing strings for sorting. Additionally undefined values are
             * always the 'smaller' value, so that they get sorted to the bottom. 
             * Can be replaced by supplying a custom compare function to TableComponent.customCompareText.
             * 
             * @param {string} a text to compare.
             * @param {string} b text to compare.
             */
            function compareText(a, b) {
                let result = 0;
                if (a == undefined || a === '') return 1;
                if (b == undefined || b === '') return -1;
                if (a.toString() > b.toString()) result = -1;
                if (a.toString() < b.toString()) result = 1;
                return result;
            }

            /**
             * Map different compare functions, depending on the content of this column. Default is a distinction between numbers and text.
             * The chooseSortCompareFn as well as the compareNumbers and compareText functions can be replaced by custom ones.
             * chooseSortCompareFn -> TableComponent.customChooseSortsCompareFn
             * 
             * @param {TableComponent} table the active instance of TableComponent.
             * @param {Array<Object>} data 
             * @param {string} column the column name (header) for which a compare function is to choose. 
             * @returns {(a: string, b: string) => number | (a: number, b: number) => number} the compare function to be used
             */
            function chooseSortsCompareFn(table, data, column) {
                // if(!Number.isNaN(data.reduce((col, cur) => (col += cur[column] != undefined ? Number.parseFloat(cur[column]) : 0), 0))){
                if (data.every(row => (typeof(tryTransformToNumber(row[column])) == 'number' || row[column] == undefined || row[column].trim() == ""))) {
                    return table.customCompareNumbers
                } else {
                    return table.customCompareText
                }
            }

            /**
             * Register the TableComponent to the customElementRegistry, so that it can be used as a WebComponent.
             * 
             * @param {class} TableComponent 
             */
            function defineCustomElement() {
                customElements.define('wc-grid-table', TableComponent);
            }

            function onSortClick(table, column, event, doRedraw) {
                if (table.header.includes(column)) {
                    if (table.sortedBy.length > 0) {
                        if (table.sortedBy[0].col === column) {
                            table.sortedBy[0].dir = table.sortedBy[0].dir === "asc" ? "desc" : "asc";
                            table.elements.sortArrows[column].innerHTML = table.sortedBy[0].dir === "asc" ? "&uarr;" : "&darr;";
                            // table.sortedData = [].concat(table.sortedData.filter(entry => entry[column] != undefined).reverse(), table.sortedData.filter(entry => entry[column] == undefined));
                            // table.redrawData();
                            // return;
                        } else {
                            table.header.filter(header_key => header_key !== column).forEach(header_key => {
                                if (table.elements.sortArrows[header_key].innerHTML !== '&#8693;') {
                                    table.elements.sortArrows[header_key].arrowAlphaColor = table.elements.sortArrows[header_key].arrowAlphaColor * 0.5;
                                    table.elements.sortArrows[header_key].style.color = `rgb(0, 0, 0, ${table.elements.sortArrows[header_key].arrowAlphaColor})`;
                                }
                            });
                            table.sortedBy = [].concat([new Object({ col: column, dir: "asc" })], table.sortedBy);
                        }
                        table.elements.sortArrows[column].innerHTML = table.sortedBy[0].dir === "asc" ? "&uarr;" : "&darr;";
                        table.elements.sortArrows[column].arrowAlphaColor = 1;
                        table.elements.sortArrows[column].style.color = `rgb(0, 0, 0, ${table.elements.sortArrows[column].arrowAlphaColor})`;
                    } else {
                        table.sortedBy = [].concat(table.sortedBy, [new Object({ col: column, dir: "asc" })]);
                        table.elements.sortArrows[column].innerHTML = "&uarr;";
                        table.elements.sortArrows[column].arrowAlphaColor = 1;
                        table.elements.sortArrows[column].style.color = `rgb(0, 0, 0, ${table.elements.sortArrows[column].arrowAlphaColor})`;
                    }
                    table.serializeLinkOptions()
                    if (doRedraw) table.redrawData()
                }
            }


            function transformToGroupedData(initialData, groupColumns) {
                let groups = initialData.map(fullRow => {
                        let result = {};
                        groupColumns.forEach(groupColumn => {
                            result[groupColumn] = fullRow[groupColumn];
                        });
                        return result;
                    })
                    .reduce((col, cur) => (!col.includes(cur) ? [].concat(col, [cur]) : col), []);

                // console.log(groups);
            }

            function filterChanged(table, column, event) {
                table.pagination.currentPage = 1;
                table.filter[column] = event.srcElement.textContent;
                table.redrawData();
                table.serializeLinkOptions()
            }

            /**
             * table.filterNegate[column] === undefined shall be equal to 'contains'.
             * @param {*} table 
             * @param {*} column 
             * @param {*} event 
             */
            function toggleFilterNegator(table, column, reverse, event) {
                event.preventDefault();
                let newOperation = table.activeFilterOperations[column];
                if (newOperation === undefined || newOperation == '') newOperation = table.filterOperations[0].name;
                newOperation = table.filterOperations[(table.filterOperations.findIndex(element => (element.name == newOperation)) + table.filterOperations.length + (reverse ? -1 : 1)) % table.filterOperations.length].name;
                if (table.elements.filterOperations[column]) table.elements.filterOperations[column].innerHTML = table.filterOperations.find(op => op.name == newOperation).char;
                table.activeFilterOperations[column] = newOperation;
                table.redrawData();
                table.serializeLinkOptions();
            }

            function setUpSorting(element, column, table) {
                element.addEventListener('click', (event) => onSortClick(table, column, event, true))
            }

            function createHeaderTooltip(table) {
                let tooltip = table.elements.tooltip = document.createElement('div');
                tooltip.state = {
                    offsetLeft: 0
                }
                tooltip.classList.add('header-col-tooltip');
                tooltip.classList.add('wgt-cell');
                table.append(tooltip)
            }

            function onHeaderMouseEnter(table, columnElement, columnName) {
                table.elements.tooltip.innerHTML = columnName;
                table.elements.tooltip.state.offsetLeft = columnElement.offsetLeft;
                table.elements.tooltip.style.left = `${(columnElement.offsetLeft) - table.scrollLeft}px`;
                table.elements.tooltip.classList.add('visible');
            }

            function onHeaderMouseLeave(table, columnElement, columnName) {
                table.elements.tooltip.classList.remove('visible');
            }

            function createHeader(table) {
                let col_height = 0;
                createHeaderTooltip(table);
                if (!table.elements.header) table.elements.header = {};
                table.header.forEach((column, columnIndex) => {
                    let col_header = document.createElement('div');
                    col_header.classList.add('wgt-header')
                    col_header.classList.add(`wgt-column_${column.split(' ').join('_')}`)
                    col_header.classList.add('wgt-cell');
                    let col_container = document.createElement('div');
                    col_container.classList.add('wgt-col-header-container');
                    col_container.innerHTML = column;
                    col_header.append(col_container);
                    col_header.addEventListener('mouseenter', onHeaderMouseEnter.bind(this, table, col_header, column));
                    col_header.addEventListener('mouseleave', onHeaderMouseLeave.bind(this, table, col_header, column));
                    table.append(col_header)
                    col_height = col_header.offsetHeight;
                    let sort_arrow = document.createElement('div');
                    sort_arrow.classList.add('arrow');
                    sort_arrow.innerHTML = '&#8693;';
                    sort_arrow.addEventListener('mouseenter', function(event) {
                        onHeaderMouseLeave(table, col_header, column);
                        event.stopPropagation();
                    });
                    sort_arrow.addEventListener('mouseleave', onHeaderMouseEnter.bind(this, table, col_header, column));
                    table.elements.header[column] = col_header;
                    table.elements.sortArrows[column] = sort_arrow;
                    setUpSorting(sort_arrow, column, table)
                    col_header.append(sort_arrow)

                });
                table.addEventListener('scroll', (event) => {
                    table.elements.tooltip.style.left = `${(table.elements.tooltip.state.offsetLeft) - table.scrollLeft}px`;
                });
                window.addEventListener('message', function(event) {
                    if (event.data) {
                        try {
                            console.log(event.data);
                            let dataObj = JSON.parse(event.data); // dataObj = {type: 'fix-columns', element: undefined, data: undefined}
                            if (dataObj.type === 'fix-columns') fixColumnHeader(table, col_height);
                        } catch (error) {
                            if (error.name == 'SyntaxError') {
                                // Ignore json parse errors; all messages from me use json;
                            } else {
                                console.error(error);
                            }
                        }
                    }
                });
                requestAnimationFrame(() => {
                    setTimeout(fixColumnHeader.bind(this, table, col_height), 1000);
                    createStickyFilterStyle(table, col_height);
                }); // createStickyFilterStyle(table, col_height);
            }

            function createStickyFilterStyle(table, col_height) {
                let tmp_style = table.elements.stickyStyle;
                if (!tmp_style) {
                    table.elements.stickyStyle = tmp_style = document.createElement('style');
                    tmp_style.type = "text/css";
                    tmp_style.classList.add('sticky_filter_offset');
                }
                tmp_style.innerHTML = `
      .table-id-${table.tableId} > .wgt-filter_cell {
        top: ${col_height}px;
      }
    `;
                table.root_document.head.append(tmp_style);
            }

            function createFilter(table, header, filter) {
                table.elements.filterCells = {};
                table.elements.filterOperations = {};
                header.forEach(column => {
                    let filter_container = document.createElement('div');
                    // let filter_input = document.createElement('input');
                    // filter_input.type = 'text';
                    // filter_input.classList.add('wgt-filter_input');
                    // filter_input.value = filter[column] ? filter[column] : '';
                    // filter_container.addEventListener('input', event => filterChanged.bind(null, table, column)(event))
                    filter_container.classList.add('wgt-filter_cell', `wgt-filter_cell_${column.split(' ').join('_')}`, 'wgt-filter_input');
                    // filter_container.contentEditable = 'true';

                    let filter_input = document.createElement('div')
                    filter_input.addEventListener('input', event => filterChanged.bind(null, table, column)(event));
                    filter_input.classList.add('filter_input');
                    filter_input.contentEditable = 'true';
                    let filter_negate = document.createElement('div');
                    table.elements.filterOperations[column] = filter_negate;
                    filter_negate.innerHTML = '&sube;';
                    filter_negate.classList.add('filter_negator');

                    filter_negate.addEventListener('click', event => toggleFilterNegator.bind(null, table, column, false)(event));
                    filter_negate.addEventListener('contextmenu', event => toggleFilterNegator.bind(null, table, column, true)(event));
                    // filter_negate.style.position = 'absolute';
                    // filter_negate.style.
                    // filter_container.append(filter_input);
                    filter_container.append(filter_input);
                    filter_container.append(filter_negate);
                    table.elements.filterCells[column] = filter_container;
                    table.append(filter_container);
                })
            }

            function createResetLinkButton(table) {
                let btn = document.createElement('div');
                btn.classList.add('footer-button', 'wgt-footer-cell', 'wgt-cell');
                btn.innerHTML = 'reset';
                btn.addEventListener('click', function(event) {
                    if (confirm('Sicher, dass alle angewendeten Umformungen zurückgesetzt werden sollen')) {
                        let url = new URL(location.href);
                        url.search = '?' + url.search.slice(1).split('&').filter(entry => !entry.split('=')[0].startsWith('table')).join('&');
                        location.href = url.href;
                    }
                });
                return btn;
            }

            function createFooter(table, data, pageChooser) {
                bindColumnChooserHandler(table);
                let footer = document.createElement('div');
                footer.classList.add('wgt-footer')
                footer.style.gridColumn = `1 / ${table.header.length + 1}`

                if (!table.elements.columnChooserMenuContainer) {
                    table.elements.columnChooserMenuContainer = createColumnChooserMenuContainer(table, table.headerAll);
                    table.parentElement.insertBefore(table.elements.columnChooserMenuContainer, table.nextSibling);
                }

                let total_rows = document.createElement('div');
                total_rows.innerHTML = `Total: ${table.data.length}`;
                total_rows.classList.add('wgt-footer_cell', 'wgt-cell')
                footer.append(total_rows)
                table.elements.total_rows = total_rows;

                if (table.data.length !== data.length) {
                    let filtered_row_count = document.createElement('div');
                    filtered_row_count.innerHTML = `Filtered: ${data.length}${table.pagination.active ? ` / ${table.pagination.filteredDataCount}` : ''}`;
      filtered_row_count.classList.add('wgt-footer_cell', 'wgt-cell')
      footer.append(filtered_row_count)
      table.elements.filtered_row_count = filtered_row_count;
    }
    
    if(footer) footer.append(createColumnChooserButton(table));
    if(table.drawOptionals.rewriteurl) footer.append(createResetLinkButton(table));
    if(pageChooser) footer.append(pageChooser);
    if(table.elements.footer) table.elements.footer.remove();
    table.elements.footer = footer;
    table.append(footer);
  }

  let boundColumnChooserButtonHandler = undefined;
  let boundColumnChooserOutsideHandler = undefined;
  let boundColumnChooserChangeColumnHandler = undefined;

  function bindColumnChooserHandler(table){
    boundColumnChooserButtonHandler = onColumnChooserButtonHandler.bind(null, table);
    boundColumnChooserOutsideHandler = onColumnChooserOutsideHandler.bind(null, table);
  }

  function createColumnChooserButton(table){
    let but = document.createElement('div');
    but.classList.add('wgt-footer_cell', 'wgt-cell', 'footer-button-down', 'footer-button');
    but.innerHTML = 'columns';
    but.addEventListener('click', boundColumnChooserButtonHandler);
    return but;    
  }

  function createColumnChooserMenuItems(table, column){
    let colItem = document.createElement('li');
    colItem.classList.add('column-chooser-item', 'column-chooser');
    let label = document.createElement('label');
    label.innerHTML = column;
    label.setAttribute('name', column + '_checkbox');
    label.classList.add('column-chooser');
    let checkBox = document.createElement('input');
    checkBox.setAttribute('type', 'checkbox');
    checkBox.setAttribute('name', column + '_checkbox');
    if(!table.hiddenColumns.includes(column) || table.visibleColumns.includes(column)){
      checkBox.toggleAttribute('checked');
    }
    checkBox.classList.add('column-chooser');
    boundColumnChooserChangeColumnHandler = onColumnChooserChangeColumnHandler.bind(null, table, column);
    checkBox.addEventListener('change', boundColumnChooserChangeColumnHandler);
    table.elements.columnChooserCheckbox[column] = checkBox;
    label.prepend(checkBox);
    // label.innerHTML += column; 
    colItem.append(label);
    return colItem;
  }

  function createColumnChooserMenuContainer(table, allHeader){
    if(!table.elements.columnChooserCheckbox) table.elements.columnChooserCheckbox = {};
    let menu = document.createElement('ul');
    menu.classList.add('column-chooser-menu', 'column-chooser');
    let menuContainer = document.createElement('div');
    menuContainer.classList.add('column-chooser-menu-container', 'hidden')
    console.log((new Set(allHeader)).union(table.hiddenColumns));
    ((new Set(allHeader)).union(table.hiddenColumns)).forEach(column => {
      menu.append(createColumnChooserMenuItems(table, column));
    })
    menuContainer.append(menu)
    // table.elements.columnChooserMenuContainer = menuContainer;
    return menuContainer;
  }

  function onColumnChooserButtonHandler(table, event){
    let offset = table.offsetLeft;

    if(table.elements.total_rows){
      offset += table.elements.total_rows.offsetWidth;
    }
    if(table.elements.filtered_row_count){
      offset += table.elements.filtered_row_count.offsetWidth;
    }

    table.elements.columnChooserMenuContainer.style.left = `${offset}px`;

    let classList = table.elements.columnChooserMenuContainer.classList;
    if(classList.contains('hidden')){
      classList.remove('hidden');
      table.root_document.addEventListener('click', boundColumnChooserOutsideHandler)
    } else {
      classList.add('hidden')
      table.root_document.removeEventListener('click', boundColumnChooserOutsideHandler)
    }

  }

  function onColumnChooserOutsideHandler(table, event){
    if(!event.srcElement.classList.contains('column-chooser')){
      if(!event.srcElement.classList.contains('footer-button')){
        let classList = table.elements.columnChooserMenuContainer.classList;
        classList.add('hidden');
        table.root_document.removeEventListener('click', boundColumnChooserOutsideHandler)
      }
    }
  }

  function onColumnChooserChangeColumnHandler(table, column, event){
    if(event.srcElement.checked){
      table.hiddenColumns = table.hiddenColumns.filter(entry => entry != column);
      table.visibleColumns.push(column);
    } else {
      table.hiddenColumns.push(column);
      table.visibleColumns = table.visibleColumns.filter(entry => entry !== column);
    }
    table.serializeLinkOptions();
    table.redrawTable();
  }

  function fillData(table, data){
    table.elements.dataCells = {};
    data.forEach((row, rowIndex) => {
      table.header.forEach( (column, columnIndex) => {
        let cell = document.createElement('div');
        cell.classList.add('wgt-cell', 'wgt-data-cell', `wgt-column_${column.split(' ').join('_')}`, `wgt-row_${rowIndex}`, `wgt-zebra_${rowIndex % 2}`)
        // cell.classList.add()
        // cell.classList.add()
        cell.innerHTML = row[column] != undefined ? row[column] : '';
        // if(column === '#include') {
        //   cell.setAttribute('contentEditable', 'true');
        //   let tempRowActive = {...row};
        //   delete tempRowActive['#include'];
        //   // console.log(table.tickedRows);
        //   // console.log(JSON.stringify(tempRowActive));
        //   // console.log(table.tickedRows.includes(JSON.stringify(tempRowActive)));
        //   cell.innerText = table.tickedRows.includes(JSON.stringify(tempRowActive)) ? 'x' : '';
        //   cell.addEventListener('input', (event) => {       
        //     // console.log('input changed in row ' + rowIndex);     
        //     // console.log(event.target.innerText);
        //     let tempRow = {...row};
        //     delete tempRow['#include'];
        //     if(event.target.innerText){
        //       // console.log('added row');
        //       table.tickedRows.push( JSON.stringify(tempRow));
        //     } else {
        //       // console.log('removed row');
        //       table.tickedRows = table.tickedRows.filter(value => (value !== JSON.stringify(tempRow)));
        //     }
        //     table.serializeLinkOptions();
        //   });
        // }
        if(!table.elements.dataCells[column]) table.elements.dataCells[column] = [];
        table.elements.dataCells[column].push(cell);
        table.append(cell)
      })
    })
  }

  /**
   * Read the column names (header) from the data, if they are not supplyed. 
   * 
   * @param {Array<Object>} data 
   * @returns {Array<string>} the list of column names.
   */
  function generateHeader(data){
    return data.map(Object.keys).reduce((col, cur) => {
      let result = col;
      cur.forEach(value => {
        if(!col.includes(value)) result.push(value)
      })
      return result;
    }, [])
  }

  function applyConditionalColumnStyling(table, data, header, conditionalColumnStyle, options){
    if(options.active){
      let column_style_element = table.elements.columnStyle;
      if(!column_style_element){
        table.elements.columnStyle = column_style_element = document.createElement('style');
        column_style_element.type = "text/css";
        column_style_element.classList.add('column_styles');
        table.root_document.head.append(column_style_element);
      }
      column_style_element.innerHTML = '';
      header.forEach(column => {
        conditionalColumnStyle.forEach((conditionalStyle) => {
          if(conditionalStyle.condition(data, column)){
            column_style_element.innerHTML += `
              div.wgt-column_${column}.wgt-data-cell {
                ${conditionalStyle.styles.join('\n')}
              }
            `
          }
        })
      })
    }
  }

  function applyConditionalRowStyling(table, data, header, conditionalRowStyle, options){
    if(options.active){
      let row_style_element = table.elements.columnStyle;
      if(!row_style_element){
        table.elements.columnStyle = row_style_element = document.createElement('style');
        row_style_element.type = "text/css";
        row_style_element.classList.add('row_styles');
        table.root_document.head.append(row_style_element);
      }
      row_style_element.innerHTML = '';
      Object.keys(conditionalRowStyle).forEach(column => {
        data.forEach((row, row_index) => {
          conditionalRowStyle[column].forEach(conditionalStyle => {
            if(conditionalStyle.condition(row[column], row_index)){
              row_style_element.innerHTML += `div${conditionalStyle.fullrow ? '' : `.wgt-column_${column}`}.wgt-row_${row_index} {\n`
              row_style_element.innerHTML += conditionalStyle.styles.join('\n')
              row_style_element.innerHTML += '\n}'
            }
          })
        }) 
      })
      // table.root_document.querySelector('head').append(row_style_element)
    }
  }

  function resetSorting(table){
    table.sortedData = table.data ? table.data.map(value => value) : [];
    table.sortedBy = [];
    if(table.header) table.header.forEach(column => {
      table.elements.sortArrows[column].innerHTML = '&#8693;';
      table.elements.sortArrows[column].arrowAlphaColor = 1.0;
      table.elements.sortArrows[column].style.color = `lightgray`;
    });
  }

  function resetFilterOperations(table){
    table.header.forEach(column => {
      let operation = table.filterOperations.find(op => (op.name == table.activeFilterOperations[column]));
      if(operation) table.elements.filterOperations[column].innerHTML = operation.char;
    });    
  }

  /**
   * Sorts the data, be the spcified sorting (table.sortedBy).
   * @param {TableComponent} table reference to TableComponent
   * @returns {Object[]} sorted data
   */
  function applySorting(table){
    // if(column) {
    //   return table.sortedData.sort((a, b) => {
    //     return table.customChooseSortsCompareFn(table, table.sortedData, column)(a[column], b[column])
    //   })
    // } else 
    if(table.sortedBy && table.sortedBy.length > 0) {
      column = table.sortedBy[0].col;
      let sorted = table.sortedData.sort((a, b) => {
        return table.customChooseSortsCompareFn(table, table.data, column)(a[column], b[column])
      })
      if(table.sortedBy[0].dir === 'desc')
        sorted = [].concat(sorted.filter(entry => entry[column] != undefined && entry[column] !== '').reverse(), sorted.filter(entry => entry[column] == undefined || entry[column] === ''));
      return sorted;
    } else {
      return table.sortedData;
    }
  }

  function applyFilter(table, data, header, filter, options){
    if(options.active){
      return data.filter(row => 
        header.map(column => {
          if(filter[column]){
            if (table.activeFilterOperations[column] == '' || table.activeFilterOperations[column] == undefined) table.activeFilterOperations[column] = table.filterOperations[0].name;
            return table.filterOperations.find(op => (op.name == table.activeFilterOperations[column])).fn(filter[column], row[column]);
          } else return true;
        }).reduce((col, cur) => (col && cur), true)
      )
    } else {
      return data;
    }
  }

  function applyFormatter(data, header, formatter, options){
    if(options.active){
      // console.log(header);
      return data.map((row, rowNr, dataReadOnly) => {
        let formattedRow = row; 
        // console.log(header);
        header.forEach(column => {
          // if(column === '#include' && rowNr === 0){
          //   console.log('include 0', row, row[column], formatter[column]);
          // }

          if(formatter[column]){
            formattedRow[column] = formatter[column].reduce((col, cur) => cur(col, rowNr, dataReadOnly), row[column])//.toString();
          } else {
            formattedRow[column] = row[column]
          }

          // if(column === '#include' && rowNr === 0){
          //   console.log('include 0', formattedRow);
          // }
        })
        return formattedRow;
      });
    } else {
      return data;
    }
  }

  function applyPagination(table, data){
    let result = data;
    table.pagination.active = table.paginationOptions.active;
    table.pagination.totalPages = table.pagination.active ? Math.ceil(data.length / table.pagination.pageSize) : 1;
    if(table.pagination.totalPages == 1){
      table.pagination.active = false;
    } else {
      result = data.filter((value, index) => 
        !table.pagination.active
        || ((index >= (table.pagination.currentPage - 1) * table.pagination.pageSize) 
        && (index < (table.pagination.currentPage) * table.pagination.pageSize))
      );
    }
    return result;
  }

  function drawTable(table){
    table.elements.sortArrows = {};

    // table.data = table.data.map(entry => {
    //   let tempRow = entry;
    //   delete tempRow['#include'];
    //   return {'#include': table.options.tickedRows.includes(JSON.stringify(tempRow)) ? 'x' : '', ...tempRow};
    // });
    

    table.drawOptionals = {
      header: !table.hasAttribute('noheader'),
      filter: !table.hasAttribute('nofilter'), //! TODO fix Broken nofilter
      footer: !table.hasAttribute('nofooter'),
      pagekey: !table.hasAttribute('nopagekey'),
      rewriteurl: !table.hasAttribute('norewriteurl'),
    }
    
    table.innerHTML = "";
    if(!table.data) table.data = [];      
    if(!table.sortedData) table.sortedData = table.data.map(value => value);

    if(!table.headerAll && table.data.length > 0){
      let genHeader = generateHeader(table.data);
      console.log('genheader', genHeader);
      // if(!genHeader.includes('#include')) table.headerAll = ['#include'].concat(genHeader);
      table.headerAll = genHeader;

      
      table.hiddenColumns = table.hiddenColumns.concat(table.headerAll.filter(column =>
        table.hiddenColumnsCondition
          .map(condition => ({col: column, hidden: condition(column, table.data)}))
          .filter(columnCond => columnCond.hidden)
          .map(columnCond => columnCond.col)
          .includes(column)
      ));
    }

    if(table.headerAll && table.elements.columnChooserCheckbox) {
      for(let column of table.headerAll){
        if(table.hiddenColumns.includes(column) && !table.visibleColumns.includes(column)){
          table.elements.columnChooserCheckbox[column].checked = false;
        } else {
          table.elements.columnChooserCheckbox[column].checked = true;
        }
      }
    }

    console.log('hidden columns', table.hiddenColumns);

    if(table.headerAll){
      table.header = 
        table.headerAll.filter(column => 
          !table.hiddenColumns.includes(column) || table.visibleColumns.includes(column)
        )
      table.style.gridTemplateColumns = `repeat(${table.header.length}, max-content)`;
    }

    if(table.drawOptionals.header && table.header){
      createHeader(table);
    }
    
    if(table.drawOptionals.filter && table.header){
      createFilter(table, table.header, table.filter);
    }

    if (table.data.length > 0){
      // table.data = table.data;
      table.displayedData = drawData(table);

      //? Log, that is send to Tracker Server:
      console.log('Finished transform of data.', table.displayedData, appname);

      table.elements.pageChooser = createPageChooser(table, table.displayedData);

      if (table.drawOptionals.footer) createFooter(table, table.displayedData, table.elements.pageChooser);
    }

    if (table.drawOptionals.pagekey){
      addKeyHandlerToDocument(table);
    }
  }

  function drawData(table){
    table.sortedData = applySorting(table);
    applyConditionalColumnStyling(table, table.sortedData, table.header, table.conditionalColumnStyle, table.conditionalStyleOptions);
    console.log('sorted data', table.sortedData);
    console.log('header', table.header);
    let formattedData = applyFormatter(table.sortedData, table.header, table.formatter, table.formatterOptions);
    console.log('formatted data', formattedData);
    let filteredData = applyFilter(table, formattedData, table.header, table.filter, table.filterOptions);
    console.log('filtered data', filteredData);
    table.pagination.filteredDataCount = filteredData.length;
    let pageinatedData = applyPagination(table, filteredData);
    console.log('paginated data', pageinatedData);
    // pageinatedData = pageinatedData.map(entry => ({'#include': table.tickedRows.includes(JSON.stringify(entry)) ? 'x' : '', ...entry}))
    table.style.gridTemplateRows = `${
      table.drawOptionals.header ? 'max-content' : ''} ${
        table.drawOptionals.filter ? 'max-content' : ''} repeat(${pageinatedData.length}, max-content) ${
          table.drawOptionals.footer ? 'max-content' : ''}`; 
    fillData(table, pageinatedData);
    applyConditionalRowStyling(table, pageinatedData, table.header, table.conditionalRowStyle, table.conditionalStyleOptions);
    return pageinatedData;
  }

  function defineHiddenProperties(table, props){
    props.forEach(prop => Object.defineProperty(table, prop, {
      enumerable: false,
      writable: true,
      // configurable: true,
    }))
  }

  function defineOptionProperties(table, props){
    props.forEach(prop => 
      Object.defineProperty(table, prop, {
        enumerable: true,
        writable: true
      })
    );
  }

  const funRegex = /^((?:function\s*.*){0,1}\(([^\(\{\[\=\>]*)\)\s*(?:=>|\{)\s*[\{\(]{0,1}.*[\}\)]{0,1})$/gy;

  function deserializeFunction(funStr){
    let match = funRegex.exec(funStr);
    let args = match.groups[2].split(',').map(str => str.trim())
    return new Function(...args, `return (${funStr.toString()})(${args.join(', ')})`)
  }

  function serializeFunction(fun){
    return fun.toString();
  }

  function replaceUrlSearchParameter(newParamKey, newParamValue){
    let result = '?';
    let replaced = false;
    let oldParams = location.search.slice(1).split('&')
    if(oldParams.length > 1){
      oldParams.forEach(oldParam => {
        let oldParamKey = oldParam.split('=')[0];
        if(oldParamKey == newParamKey) {
          replaced = true;
          result += `${oldParamKey}=${newParamValue}&`;
        }
        else result += `${oldParamKey}=${oldParam.split('=').slice(1).join('=')}&`;
      })
    } else if(oldParams.length == 1){
      if (oldParams[0] == ""){
        replaced = true;
        result += `${newParamKey}=${newParamValue}&`;
      } else {
        if (oldParams[0].split('=')[0] == newParamKey){
          replaced = true;
          result += `${newParamKey}=${newParamValue}&`;
        } else {
          result += `${oldParams[0].split('=')[0]}=${oldParams[0].split('=').slice(1).join('=')}&`;
        }
      }
    }
    if (!replaced) result += `${newParamKey}=${newParamValue}&`;
    return result.slice(0, -1) + location.hash;
  }

  function reapplySorting(table, partialOptions){
    console.log('reaply sorting')
    resetSorting(table);
    if(partialOptions['sortedBy']) partialOptions['sortedBy'].reverse().slice(-4).forEach(sortStep => {
      if(sortStep.dir == 'desc'){
        onSortClick(table, sortStep.col)
      }
      onSortClick(table, sortStep.col)
    })
  }

  /**
   * TableComponent is the implementation of wc-grid-table (short: wgt).
   * 
   * The following functions are exposed when creating a wgt HTML element (documented in there respective docstring):
   *  - useDefaultOptions()
   *  - connectedCallback()
   *  - setDebounceFn(debounceFn, sortDebounceOptions, filterDebouncedOptions)
   *  - setData(data)
   *  - getDisplayedData()
   *  - getOriginalData()
   *  - redrawData()
   * 
   * The following properties can be accessed directly:
   *  - root_document - either document or the connected shadowRoot
   *  - conditionalColumnStyle - an object with keys ["condition", "styles"] where condition is a function "(data : Array<Object> , column : string) => Boolean" and styles is
   *    an Array of strings with styles, that should apply when "condition" returns true for a column.
   *    Can be used to style a column in dependency of their data. 
   *  - conditionalStyleOptions - an object with options concerning conditionalColumnStyle and conditionalRowStyle. Available Options:
   *      - active: Boolean
   *  - formatter - an Object with column names as keys, containing lists of formatter functions, that should be applied before displaing a table value. Formatter functions
   *    have this signature: "(value, rowIndex, completeData) => any". Formatter get applied in the sequence they are in the list (leftmost function (2nd from left (3rd ...))).
   *  - formatterOptions - an object with options concerning formatter. Available Options:
   *      - active: Boolean
   *  - filter - an Object with column names as keys, containing strings which correspond to the filter input values in the ui. 
   *    Those get validated by filterOperations.fn.
   *  - filterOptions - an object with options concerning filter. Available Options:
   *      - active: Boolean
   *  - filterOperations - an object with operations, filters and chars for different filter options toggleable. `{Column1: {name: 'modFilter', char: '%', fn: function(filterInput, testValue)}}`
   *  - sortedBy - an Array of Objects describing sorting. Keys are col - column name sorted - and dir - the sort direction (one of ["asc", "desc"]). Sorting is kept after each
   *    sorting operation, so that primary, secondary, tertiary, ... sorting is possible.
   *  - sortOptions - an object with options concerning sorting. Available Options:
   *      - active: Boolean
   *  - customChooseSortsCompareFn - a function maps columns to sorting behavior. Expected return for given (table: TableComponent instance, data: Array<Object>, column: string)
   *    is a function to compare the values of this column.
   *  - customCompareNumbers / customCompareText - functions to replace default sort behavior corresponing to sorting numbers / text. Like default js CompareFn used in Array.prototype.sort
   */
  class TableComponent extends HTMLElement{
    constructor(){
      super();

      defineSetPrototypeFunctions();

      this.linkOptions = [
        'pagination',
        'filter',
        'sortedBy',
        'activeFilterOperations',
        'hiddenColumns',
        'visibleColumns',
        // 'tickedRows',
      ]

      defineHiddenProperties(this, [
        'options',
        'root_document',
        'optionalDebounceFn',
        'sortedData',
        'data',
        'header',
        'displayedData',
        'drawOptionals',
        'elements',
        'tableId',
      ]);

      this.options = {}

      defineOptionProperties(this, [
        'conditionalColumnStyle',
        'conditionalRowStyle',
        'conditionalStyleOptions',
        'formatter',
        'formatterOptions',
        'filter',
        'filterOptions',
        'filterOperations',
        'activeFilterOperations',
        'sortedBy',
        'sortOptions',
        'pagination',
        'customCompareNumbers',
        'customCompareText',
        'customChooseSortsCompareFn',
        'hiddenColumns',
        'hiddenColumnsCondition',
        'visibleColumns',
        'tickedRows',
      ]);

      this.useDefaultOptions();
    }

    /**
     * Reset Options to the default configuration.
     */
    useDefaultOptions(){
      this.root_document = document;

      this.elements = {};

      // this.tableId = 0;
      this.tableId = tableCounter++;

      this.data = [];
      
      this.hiddenColumns = []; // ['Einzelpreis'];
      this.visibleColumns = [];
      this.hiddenColumnsCondition = [
        (column, data) => (column.startsWith('#')),
      ];

      this.elements.sortArrows = {};
      this.optionalDebounceFn = undefined;
      this.activeFilterOperations = {};

      this.paginationOptions = {
        active: true,
      }

      this.pagination = {
        active: true,
        currentPage: 1,
        pageSize: 40,
      }

      this.filterOperations = [
        {name: 'containsEx', char: '&sube;', fn: regexFilter.bind(null, false)}, 
        {name: 'notContainsEx', char: '&#8840;', fn: regexFilter.bind(null, true)}, 
        {name: 'equals', char: '=', fn: compareFilter.bind(null, (a, b) => a == b)}, 
        {name: 'greater', char: '>', fn: compareFilter.bind(null, (a, b) => a < b)}, 
        {name: 'greaterEquals', char: '&ge;', fn: compareFilter.bind(null, (a, b) => a <= b)}, 
        {name: 'lesser', char: '<', fn: compareFilter.bind(null, (a, b) => a > b)}, 
        {name: 'lesserEquals', char: '&le;', fn: compareFilter.bind(null, (a, b) => a >= b)}, 
        {name: 'unEquals', char: '&ne;', fn: compareFilter.bind(null, (a, b) => a != b)}, 
      ]

      this.conditionalColumnStyle = []; /*[
        {
          condition: (data, column) => (!Number.isNaN(data.reduce((col, cur) => (col += typeof cur[column] === "string" ? NaN : (cur[column] != undefined ? cur[column] : 0)), 0))),
          styles: ["text-align: right;"]
        },
      ]*/

      this.conditionalRowStyle = {
       /* Rabattsatz: [
          {
            condition: function(value, index){
              return value == 0 && index % 2 != 0;
            },
            styles: ["background-color: lightcoral;", "color: black;"],
            fullrow: true
          }, {
            condition: function(value, index){
              return value == 0 && index % 2 == 0;
            },
            styles: ["background-color: darksalmon;", "color: black;"],
            fullrow: true
          }, {
            condition: function(value, index){
              return value > 0 && index % 2 != 0;
            },
            styles: ["background-color: lightgreen;", "color: black;"],
            fullrow: true
          }, {
            condition: function(value, index){
              return value > 0 && index % 2 == 0;
            },
            styles: ["background-color: darkseagreen;", "color: black;"],
            fullrow: true
          }
        ]*/
      }

      this.conditionalStyleOptions = {
        "active": true,
      }

      this.formatter = {}
      this.formatterOptions = {
        "active": true,
      }

      this.filter = {}
      this.filterOptions = {
        "active": true,
      }

      this.sortedBy = [];
      this.sortOptions = {
        "active": true,
      }
      this.customCompareNumbers = compareNumbers;
      this.customCompareText = compareText;
      this.customChooseSortsCompareFn = chooseSortsCompareFn;
      
      this.drawOptionals = {};

      this.tickedRows = [];
    }

    loadPartialOptions(partialOptions){
      if (this.data.length > 0){
        console.log('partial', partialOptions)
        Object.keys(partialOptions).sort((a, b) => (a == 'hiddenColumns') ? 1 : -1).forEach(option => {
          if(option == 'sortedBy'){
            reapplySorting(this, partialOptions);
          } else if (option == 'hiddenColumns') {
            this[option] = partialOptions[option];
            this.redrawTable();
          } else {
            this[option] = partialOptions[option];
            // console.log(option, this[option]);
          }
        });
        resetFilterOperations(this)
        this.redrawData()
      }
    }

    serializeLinkOptions(){
      let linkOptions = new Object();
      this.linkOptions.forEach(option => {
        linkOptions[option] = this[option];
      })
      let newSerializedValue = btoa(JSON.stringify(linkOptions, (key, value) => value instanceof Function ? serializeFunction(value) : value));
      let newUrlSearchParam = replaceUrlSearchParameter(`table${this.tableId}`, newSerializedValue);
      if(this.drawOptionals.rewriteurl) history.replaceState(history.state, '', newUrlSearchParam)
    }

    loadLinkOptions(){
      let serializedOptions = '{}';
      location.search.slice(1).split('&').forEach(searchOption => {
        let split = searchOption.split('=')
        if(split[0] == `table${this.tableId}`){
          serializedOptions = atob(split.slice(1).join('='));
        }
      })
      let partialOptions = JSON.parse(serializedOptions, (key, value) => {
        if (!(value instanceof Array)  && value.toString().match(funRegex)) {
          return deserializeFunction(value)
        } else {
          return value
        }
      });
      return partialOptions;
      // this.redrawData():
    }

    deserializeOptions(serializedOptions){
      if(serializedOptions){
        return JSON.parse(atob(serializedOptions, (key, value) => {
          if (!(value instanceof Array)  && value.toString().match(funRegex)) {
            return deserializeFunction(value);
          } else {
            return value;
          }
        }));
      } else {
        return {};
      }
    }

    loadSerializedOptions(serializedOptions){
      this.options = JSON.parse(serializedOptions, (key, value) => {
        if (!(value instanceof Array)  && value.toString().match(funRegex)) {
          return deserializeFunction(value)
        } else {
          return value
        }
      });
      // this.sortedData = applySorting(this);
      this.tickedRows = this.options.tickedRows;
      this.redrawData();
    }

    /**
     * Called when table is added to DOM. Doesn't need to be called manually.
     */
    connectedCallback(){
      if(!this.root_document.body) this.root_document.body = document.createElement('body');
      if(!this.root_document.head) this.root_document.head = document.createElement('head');

      // this.tableId = this.root_document.querySelectorAll('.wgt-grid-container').length; //// TODO: check if multiple tables have consistantly different ids.
      this.classList.add(`table-id-${this.tableId}`);      
      this.classList.add('wgt-grid-container')
      if(!this.sortedData && this.data) this.sortedData = this.data.map(value => value);
      let height = this.getAttribute('height');
      if(height) this.style.maxHeight = height;
      let pageSize = this.getAttribute('page-size');
      if(pageSize) {
        this.pagination.pageSize = pageSize;
      }

      this.loadInitialOptions();
      drawTable(this);
    }
 
    loadInitialOptions(){
      let attributeOptions = this.deserializeOptions(this.getAttribute('options'));
      let linkOptions = this.loadLinkOptions();

      ((new Set(Object.keys(attributeOptions))).union(Object.keys(linkOptions))).forEach(option => {
        if(attributeOptions[option]){
          this.options[option] = attributeOptions[option];
        }
        if(linkOptions[option] && Object.keys(linkOptions[option]).length != 0){
          this.options[option] = linkOptions[option];
        }
      });
      // console.log(this.options)

      this.loadPartialOptions(this.options);
    } 

    /**
     * Configure a debounce function for event based table changes like sortClick and filterChange.
     * 
     * @param {Function} debounceFn a debounce function; has to return the debounced function; the debounced function should implement a cancel function. (tested with lodash.debounce)
     * @param {Array<any>} sortDebounceOptions the arguments list for the sort click event required by the debounce function.
     * @param {Array<any>} filterDebouncedOptions the arguments list for the filter change event required by the debounce  by the debounce function.
     */
    setDebounceFn(debounceFn, sortDebounceOptions, filterDebouncedOptions){
      if(this.optionalDebounceFn) {
        onSortClick.cancel()
        filterChanged.cancel()
      }
      this.optionalDebounceFn = debounceFn;
      onSortClick = this.optionalDebounceFn(onSortClick, ...sortDebounceOptions);
      filterChanged = this.optionalDebounceFn(filterChanged, ...filterDebouncedOptions);
    }

    /**
     * Set the data to be displayed by table as a list of row objects.
     * 
     * @param {Array<Object>} data 
     */
    setData(data){
      // let dataWithInclude = data.map(entry => {
      //   let tempRow = entry;
      //   // delete tempRow['#include'];
      //   // tempRow['#include'] = 'x';
      //   let result = {'#include': 'x'};
      //   Object.keys(tempRow).forEach(key => {
      //     result[key] = tempRow[key]; 
      //   })
      //   // let result = {'#include': 'x', ...tempRow};
      //   return result;
      // });
      // let dataWithInclude = data;
      // console.log('with Include', dataWithInclude);
      this.data = data;
      // console.log(transformToGroupedData(data, ["BelID", "Belegdatum", "Lieferant", "Nettobetrag"]))
      this.sortedData = this.data.map(value => value);
      drawTable(this);
      this.loadInitialOptions();
    }

    /**
     * Get the data that is sorted, formatted and filtered.
     */
    getDisplayedData(){
      return this.displayedData;
    }

    /**
     * Get the original Data that was supplied to the table.
     */
    getOriginalData(){
      return this.data;
    }

    /**
     * Force a refresh, in case the data has changed. Alternatively you can call TableComponent.setData(newData).
     */
    redrawData(){
      this.header.forEach(column => {
        if (this.elements.dataCells[column]) [].forEach.call(this.elements.dataCells[column], element => element.remove());
        if (this.drawOptionals.filter && this.elements.filterCells[column].firstChild.textContent != this.filter[column]) this.elements.filterCells[column].firstChild.textContent = this.filter[column];
        // this.elements.filterCells[column].firstChild.textContent = this.filter[column] ? this.filter[column] : '';

      }); 
      if (this.data.length > 0){
        let wasSelected = this.elements.pageChooser ? this.elements.pageChooser.classList.contains('selected') : false;
        this.displayedData = drawData(this);
        this.elements.pageChooser = createPageChooser(this, this.displayedData);
        if (this.drawOptionals.footer) createFooter(this, this.displayedData, this.elements.pageChooser);
        if (wasSelected) this.elements.pageChooser.classList.add('selected');
      }
    }

    redrawTable(){
      //this.sortedData = this.data.map(value => value);
      let partialOptions = {};
      Object.keys(this.options).forEach(option => {
        if(this.linkOptions.includes(option)){
          partialOptions[option] = this[option];
        }
      });
      drawTable(this);
      reapplySorting(this, partialOptions);
    }
  }

  return {regexFilter, textFilter, compareNumbers, compareText, chooseSortsCompareFn, defineCustomElement, TableComponent};
})()
},{"./filter-utils.js":8,"./pagination-utils.js":9,"./wc-grid-table.css":10,"murmurhash-js":5}],12:[function(require,module,exports){
var css = "div.wgt-header div {\n  word-wrap: normal;\n  white-space: nowrap;\n}\nprot-table-v3 ul {\n  padding-top: 5px;\n  padding-left: 10px;\n  background-color: white;\n}\n"; (require("browserify-css").createStyle(css, { "href": "style.css" }, { "insertAt": "bottom" })); module.exports = css;
},{"browserify-css":3}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJNYXJrSW5wdXQuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5LWNzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5kZWJvdW5jZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9tdXJtdXJoYXNoLWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL211cm11cmhhc2gtanMvbXVybXVyaGFzaDJfZ2MuanMiLCJub2RlX21vZHVsZXMvbXVybXVyaGFzaC1qcy9tdXJtdXJoYXNoM19nYy5qcyIsIm5vZGVfbW9kdWxlcy93Yy1ncmlkLXRhYmxlL3NyYy9maWx0ZXItdXRpbHMuanMiLCJub2RlX21vZHVsZXMvd2MtZ3JpZC10YWJsZS9zcmMvcGFnaW5hdGlvbi11dGlscy5qcyIsIm5vZGVfbW9kdWxlcy93Yy1ncmlkLXRhYmxlL3NyYy93Yy1ncmlkLXRhYmxlLmNzcyIsIm5vZGVfbW9kdWxlcy93Yy1ncmlkLXRhYmxlL3NyYy93Yy1ncmlkLXRhYmxlLmpzIiwic3R5bGUuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3Z2Q0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBjb25zdCB7IFByb3RUYWJsZSwgVGFibGVDb21wb25lbnQgfSA9IHJlcXVpcmUoJy4vaW5kZXgnKTtcclxuXHJcbi8vIC8qKlxyXG4vLyAgKiBAdHlwZWRlZiB7aW1wb3J0KCcuL2luZGV4JykuVGFibGVDb21wb25lbnR9IFRhYmxlQ29tcG9uZW50XHJcbi8vICAqIEB0eXBlZGVmIHtpbXBvcnQoJy4vaW5kZXgnKS5Qcm90VGFibGV9IFByb3RUYWJsZVxyXG4vLyAgKi9cclxuXHJcbi8qKlxyXG4gKiBIZWFkZXIgZm9yIGZldGNoIHJlcXVlc3RzIHRvIHRoZSBkYi1pbnRlcmZhY2UuIENvbnRlbnQtVHlwZSBuZWVkcyB0byBiZSBcImFwcGxpY2F0aW9uL2pzb25cIi5cclxuICovXHJcbmNvbnN0IGhlYWRlciA9IHtcclxuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIHRoZSBib2R5IGZvciB0aGUgZmV0Y2ggcmVxdWVzdCB0byB0aGUgZGItaW50ZXJmYWNlLlxyXG4gKiBAcGFyYW0geygpID0+IHN0cmluZ30gcXVlcnlGbiAtIGNhbGxiYWNrLCB0aGF0IGdlbmVyYXRlcyB0aGUgcXVlcnksIGJ5IHN1YnN0aXR1dGluZyB0aGUgcmVxdWlyZWQgaW5mb3JtYXRpb24gaW50byBhIHF1ZXJ5IHRlbXBsYXRlLlxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSAtIHRoZSBzdHJpbmdpZmllZCBqc29uIGJvZHlcclxuICovXHJcbmNvbnN0IGNyZWF0ZUZldGNoQm9keSA9IChxdWVyeUZuKSA9PiBKU09OLnN0cmluZ2lmeSh7IHF1ZXJ5OiBxdWVyeUZuKCkgfSk7XHJcblxyXG4vLyBjb25zdCBpbnNlcnRRdWVyeSA9IChhcnRpa2VsbnVtbWVyKSA9PiBgSU5TRVJUIElOVE8gSW52ZW50dXJDdXJyZW50UmVjb3VudCAoQXJ0aWtlbG51bW1lcikgVkFMVUVTICgnJHthcnRpa2VsbnVtbWVyfScpO2A7XHJcbi8vIGNvbnN0IGRlbGV0ZVF1ZXJ5ID0gKGFydGlrZWxudW1tZXIpID0+IGBERUxFVEUgRlJPTSBJbnZlbnR1ckN1cnJlbnRSZWNvdW50IFdIRVJFIEFydGlrZWxudW1tZXIgPSAnJHthcnRpa2VsbnVtbWVyfSc7YDtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIHRoZSBkYXRhYmFzZS1pbnRlcmZhY2UgbGluayBmb3IgYSBnaXZlbiBkYXRhYmFzZW5hbWUgYW5kIHVzZXJuYW1lLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YWJhc2UgLSBkYXRhYmFzZSBuYW1lIFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gdXNlcm5hbWUgLSBkYXRhYmFzZSB1c2VybmFtZSBcclxuICogQHJldHVybnMgXHJcbiAqL1xyXG5jb25zdCBkYXRhYmFzZVVybCA9IChkYXRhYmFzZSwgdXNlcm5hbWUpID0+IGBodHRwczovL2RhdGFiYXNlLnByb3Ryb25pYy1nbWJoLmRlL3F1ZXJ5P2RhdGFiYXNlPSR7ZGF0YWJhc2V9JnVzZXJuYW1lPSR7dXNlcm5hbWV9YDtcclxuXHJcbi8qKiBcclxuICogQSBxdWVyeSB0byBjcmVhdGUgdGhlIHRhYmxlLCBpZiBpdCBkb2VzIG5vdCBleGlzdCB5ZXQuIFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YWJhc2VUYWJsZSAtIG5hbWUgb2YgdGhlIHRhYmxlIFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSAtIHRoZSBxdWVyeSB0byBiZSBzZW5kIHRvIHRoZSBkYlxyXG4gKi9cclxuY29uc3QgY3JlYXRlVGFibGVRdWVyeSA9IChkYXRhYmFzZVRhYmxlKSA9PiBgSUYgTk9UIEVYSVNUUyAoU0VMRUNUICogRlJPTSBzeXMudGFibGVzIFdIRVJFIHN5cy50YWJsZXMubmFtZSA9ICcke2RhdGFiYXNlVGFibGV9JykgQ1JFQVRFIFRBQkxFICR7ZGF0YWJhc2VUYWJsZX0oaWRlbnRpZmllckZpZWxkIE5WQVJDSEFSKE1BWCksIGlkZW50aWZpZXJWYWx1ZSBOVkFSQ0hBUihNQVgpKTtgO1xyXG5cclxuLyoqXHJcbiAqIEEgcXVlcnkgdG8gZ2V0IGFsbCBpZGVudGlmaWVyVmFsdWVzIGZyb20gYSBnaXZlbiBkYXRhYmFzZVRhYmxlLlxyXG4gKiBAcGFyYW0geyp9IGRhdGFiYXNlVGFibGUgLSBuYW1lIG9mIHRoZSB0YWJsZSBcclxuICogQHBhcmFtIHsqfSBpZGVudGlmaWVyRmllbGQgLSB0aGUgbmFtZSBvZiB0aGUgcHJpbWFyeS1rZXktZmllbGRcclxuICogQHJldHVybnMge3N0cmluZ30gLSB0aGUgcXVlcnkgdG8gYmUgc2VuZCB0byB0aGUgZGJcclxuICovXHJcbmNvbnN0IHNlbGVjdENoZWNrZWRGb3JBbGwgPSAoZGF0YWJhc2VUYWJsZSwgaWRlbnRpZmllckZpZWxkKSA9PiBgU0VMRUNUIFtpZGVudGlmaWVyVmFsdWVdIEZST00gJHtkYXRhYmFzZVRhYmxlfSBXSEVSRSBbaWRlbnRpZmllckZpZWxkXSA9ICcke2lkZW50aWZpZXJGaWVsZH0nIEdST1VQIEJZIFtpZGVudGlmaWVyVmFsdWVdO2A7XHJcblxyXG4vKipcclxuICogQSBxdWVyeSB0byBpbnNlcnQgdmFsdWVzIGludG8gdGhlIGRhdGFiYXNlVGFibGUuIE1hcmtlZCBWYWx1ZXMgYXJlIHNhdmVkIHRvIGRiLCB1bm1hcmtlZCBvbmVzIGFyZSBub3QuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhYmFzZVRhYmxlIC0gbmFtZSBvZiB0aGUgdGFibGVcclxuICogQHBhcmFtIHtzdHJpbmd9IGlkZW50aWZpZXJGaWVsZCAtIHRoZSBuYW1lIG9mIHRoZSBwcmltYXJ5LWtleS1maWVsZFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaWRlbnRpZmllclZhbHVlIC0gdGhlIHZhbHVlIChvZiB0YWJsZS5kYXRhKSBmb3IgdGhpcyByb3cuIChpZGVudGlmaWVyVmFsdWUgPSB0YWJsZS5kYXRhW3Jvd11baWRlbnRpZmllckZpZWxkXSlcclxuICogQHJldHVybnMge3N0cmluZ30gLSB0aGUgcXVlcnkgdG8gYmUgc2VuZCB0byB0aGUgZGJcclxuICovXHJcbmNvbnN0IGluc2VydFF1ZXJ5ID0gKGRhdGFiYXNlVGFibGUsIGlkZW50aWZpZXJGaWVsZCwgaWRlbnRpZmllclZhbHVlKSA9PiBgSU5TRVJUIElOVE8gJHtkYXRhYmFzZVRhYmxlfSAoaWRlbnRpZmllckZpZWxkLCBpZGVudGlmaWVyVmFsdWUpIFZBTFVFUyAoJyR7aWRlbnRpZmllckZpZWxkfScsICcke2lkZW50aWZpZXJWYWx1ZX0nKTtgO1xyXG5cclxuLyoqXHJcbiAqIEEgcXVlcnkgdG8gZGVsZXRlIGFsbCB2YWx1ZXMgZnJvbSB0aGUgdGFibGUsIHdoaWNoIGhhdmUgbWF0Y2hpbmcgaWRlbnRpZmllci1maWVsZHMgYW5kIC12YWx1ZXMuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhYmFzZVRhYmxlIC0gbmFtZSBvZiB0aGUgdGFibGVcclxuICogQHBhcmFtIHtzdHJpbmd9IGlkZW50aWZpZXJGaWVsZCAtIHRoZSBuYW1lIG9mIHRoZSBwcmltYXJ5LWtleS1maWVsZFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaWRlbnRpZmllclZhbHVlIC0gdGhlIHZhbHVlIChvZiB0YWJsZS5kYXRhKSBmb3IgdGhpcyByb3cuIChpZGVudGlmaWVyVmFsdWUgPSB0YWJsZS5kYXRhW3Jvd11baWRlbnRpZmllckZpZWxkXSlcclxuICogQHJldHVybnMge3N0cmluZ30gLSB0aGUgcXVlcnkgdG8gYmUgc2VuZCB0byB0aGUgZGJcclxuICovXHJcbmNvbnN0IGRlbGV0ZVF1ZXJ5ID0gKGRhdGFiYXNlVGFibGUsIGlkZW50aWZpZXJGaWVsZCwgaWRlbnRpZmllclZhbHVlKSA9PiBgREVMRVRFIEZST00gJHtkYXRhYmFzZVRhYmxlfSBXSEVSRSBpZGVudGlmaWVyRmllbGQgPSAnJHtpZGVudGlmaWVyRmllbGR9JyBBTkQgaWRlbnRpZmllclZhbHVlID0gJyR7aWRlbnRpZmllclZhbHVlfSc7YDtcclxuXHJcbi8qKlxyXG4gKiBTYW5pdGl6ZXMgdXNlciBjb250cm9sbGVkIGlucHV0IGZvciB1c2UgaW4gc3FsIHF1ZXJpZXMuIFRPRE86IG5lZWRzIHRvIGJlIGltcGxlbWVudGVkIG9uIHRoZSBzZXJ2ZXIuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzcWwgLSB1bnNhbml0aXplZCBzcWwgaW5wdXRcclxuICogQHJldHVybnMge3N0cmluZ30gLSBzYW5pdGl6ZWQgc3FsIGlucHV0XHJcbiAqL1xyXG5mdW5jdGlvbiBzYW5pdGl6ZVNxbChzcWwpIHsgdGhyb3cgbmV3IEVycm9yKCd1bmltcGxlbWVudGVkIGZ1bmN0aW9uJyk7IH1cclxuXHJcbi8qKlxyXG4gKiBTZWFyY2hlcyBmb3IgdGhlIGNsb3Nlc3QgYW5jZXN0b3IgZWxlbWVudCwgdGhhdCBpcyBhIHdjLWdyaWQtdGFibGUgb3IgZXh0ZW5kcyBmcm9tIGl0LlxyXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR8SFRNTEVsZW1lbnR9IC0gdGhlIGNsb3Nlc3QgYW5jZXN0b3IgZWxlbWVudCwgdGhhdCBpcyBhIHdjLWdyaWQtdGFibGVcclxuICovXHJcbmZ1bmN0aW9uIHNlYXJjaFBhcmVudFRhYmxlKGVsZW1lbnQpIHtcclxuICAgIGxldCBjdXJyZW50RWxlbWVudCA9IGVsZW1lbnQ7XHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIGN1cnJlbnRFbGVtZW50ID0gY3VycmVudEVsZW1lbnQucGFyZW50RWxlbWVudDtcclxuICAgICAgICBpZiAoY3VycmVudEVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSAnYm9keScpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRFbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ3Byb3QtdGFibGUtdjMnIHx8IGN1cnJlbnRFbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ3djLWdyaWQtdGFibGUnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjdXJyZW50RWxlbWVudDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIE1hcmtJbnB1dCBleHRlbmRzIEhUTUxFbGVtZW50IHtcclxuICAgIC8qKlxyXG4gICAgICogTGlmZWhvb2sgb2Ygd2ViY29tcG9uZW50cywgdGhhdCBpcyBjYWxsZWQsIHdoZW4gdGhlIGNvbXBvbmVudCBoYXMgbG9hZGVkLiBcclxuICAgICAqL1xyXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XHJcbiAgICAgICAgLy8gc3VwZXIuY29ubmVjdGVkQ2FsbGJhY2soKTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQSBzdG9yZSBmb3IgVmFsdWVzIHRoYXQgYXJlIG1lYW50IHRvIGJlIHNldCBieSB0aGlzIGVsZW1lbnRzIGF0dHJpYnV0ZXMuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5kYXRhQXR0cmlidXRlcyA9IHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSB0YWJsZSBmaWVsZCwgdGhhdCBpcyB1c2VkIGFzIHByaW1hcnkga2V5LiBBdHRyaWJ1dGUgXCJpZGVudGlmaWVyZmllbGRcIiByZXF1aXJlZCFcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIElkZW50aWZpZXJGaWVsZDogdGhpcy5nZXRBdHRyaWJ1dGUoJ2lkZW50aWZpZXJmaWVsZCcpLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSB0YWJsZSB2YWx1ZSBvZiB0aGUgZGF0YS5JZGVudGlmaWVyRmllbGQgZm9yIHRoaXMgcm93LiBDYW4gYmUgc2V0IGJ5IGFkZGluZyB0aGUgXCJpZGVudGlmaWVyZmllbGRcIiBhdHRyaWJ1dGUuIFRoZSBcImlkZW50aWZpZXJmaWVsZFwiIGF0dHJpYnV0ZSBpcyByZXF1aXJlZCEgXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBJZGVudGlmaWVyVmFsdWU6IHRoaXMuZ2V0QXR0cmlidXRlKCdpZGVudGlmaWVydmFsdWUnKSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgZGF0YWJhc2UgaW4gU1FMU2VydmVyLCB3aGVyZSB0aGUgRGF0YWJhc2VUYWJsZSBpcyBzdXBwb3NlZCB0byBiZS4gQ2FuIGJlIHNldCB2aWEgdGhlIFwiZGF0YWJhc2VcIiBhdHRyaWJ1dGUgYW5kIGlzIG9wdGlvbmFsIChkZWZhdWx0OiBcIk1hcmtlckRCXCIpLiBcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIERhdGFiYXNlOiB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YWJhc2UnKSA/IHRoaXMuZ2V0QXR0cmlidXRlKCdkYXRhYmFzZScpIDogXCJNYXJrZXJEQlwiLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBkYXRhYmFzZSB1c2VyLCB0aGF0IGlzIHVzZWQgZm9yIHNhdmluZyBkYXRhIHRvIHRoZSBkYi4gSXMgc2V0IGJ5IHRoZSBcImRhdGFiYXNldXNlclwiIGF0dHJpYnV0ZSwgd2hpY2ggaXMgb3B0aW9uYWwgKGRlZmF1bHQ6IFwid2lraVwiKSFcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIERhdGFiYXNlVXNlcjogdGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGFiYXNldXNlcicpID8gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGFiYXNldXNlcicpIDogXCJ3aWtpXCIsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIHRhYmxlbmFtZSBmb3IgU1FMU2VydmVyLCB3aGVyZSB0aGUgbWFya2VkIHZhbHVlcyBhcmUgc2F2ZWQuIFRoZSBhdHRyaWJ1dGUgXCJkYXRhYmFzZVRhYmxlXCIgaXMgbm90IGFic29sdXRseSByZXF1aXJlZCwgYnV0IHRoZSBkZWZhdWx0IHRhYmxlIGlzIG9ubHkgYSBmYWxsYmFjayBhbmQgaXQgc2hvdWxkIG5vdCBiZSB1c2VkIChkZWZhdWx0OiBcIkRlZmF1bHRUYWJsZVwiKSFcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIERhdGFiYXNlVGFibGU6IHRoaXMuZ2V0QXR0cmlidXRlKCdkYXRhYmFzZXRhYmxlJykgPyB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YWJhc2V0YWJsZScpIDogXCJEZWZhdWx0VGFibGVcIixcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBXaGVuIHRoZSBodG1sIGF0dHJpYnV0ZSBcImNoZWNrZWRcIiBpcyBzZXQsIHRoZSBjaGVja2JveCBpcyBtYXJrZWQuIE9wdGlvbmFsIChkZWZhdWx0OiBmYWxzZSkhXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBJc0NoZWNrZWQ6IHRoaXMuaGFzQXR0cmlidXRlKCdjaGVja2VkJyksXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIHRleHQsIHdoaWNoIGlzIGFkZGVkIHRvIHRoZSBjaGVja2JveCwgc28gdGhhdCBpdCBjYW4gYmUgZmlsdGVyZWQgd2l0aCB0YWJsZS4gTWFya2VyVGV4dCBuZWVkcyB0byBiZSBhIHN0cmluZyB3aXRoIFwifFwiIGFzIHNlcGFyZXRvciBjaGFyYWN0ZXIuIExlZnQgdmFsdWUgaXMgZm9yIGNoZWNrZWQsIHJpZ2h0IGZvciB1bmNoZWNrZWQuIE9wdGlvbmFsIChkZWZhdWx0OiBcIi0xfDBcIikgXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAvLyBNYXJrZXJUZXh0OiB0aGlzLmdldEF0dHJpYnV0ZSgnbWFya2VydGV4dCcpID8gdGhpcy5nZXRBdHRyaWJ1dGUoJ21hcmtlcnRleHQnKSA6IFwidHJ1ZXxmYWxzZVwiLFxyXG4gICAgICAgICAgICBNYXJrZXJUZXh0OiBcInRydWV8ZmFsc2VcIixcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBIHN0b3JlIGZvciB2YWx1ZXMsIHRoYXQgYXJlIGRldGVybWluZWQgYXV0b21hdGljYWxseSBvciBkZXBlbmRlbnQgb24gdGhvc2Ugc2V0IGluIGRhdGFBdHRyaWJ1dGVzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZGF0YVByb3BlcnRpZXMgPSB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgcHJvdC10YWJsZSB3aXRoIGlzIHRoZSBjbG9zZXN0IGFuY2VzdG9yIG9mIHRoaXMgZWxlbWVudC4gIFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgUGFyZW50VGFibGU6IHNlYXJjaFBhcmVudFRhYmxlKHRoaXMpLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSB1cmwgZm9yIHRoZSBkYXRhYmFzZSB0aGF0IGlzIHNldCBpbiBcImRhdGFBdHRyaWJ1dGVzLkRhdGFiYXNlXCIuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBEYXRhYmFzZVVybDogZGF0YWJhc2VVcmwodGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZSwgdGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZVVzZXIpLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBxdWVyeSBmb3IgY3JlYXRpbmcgdGhlIHRhYmxlIChpZiBpdCBkb2Vzbid0IGV4aXN0KS4gXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBDcmVhdGVUYWJsZVF1ZXJ5OiBjcmVhdGVUYWJsZVF1ZXJ5LmJpbmQodGhpcywgdGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZVRhYmxlKSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgcXVlcnkgZm9yIGluc2VydGluZyBkYXRhIGludG8gdGhlIHRhYmxlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgSW5zZXJ0VmFsdWVzUXVlcnk6IGluc2VydFF1ZXJ5LmJpbmQodGhpcywgdGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZVRhYmxlLCB0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJGaWVsZCwgdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWUpLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBxdWVyeSBmb3IgZGVsZXRpbmcgZGF0YSBmcm9tIHRoZSB0YWJsZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIERlbGV0ZUZyb21RdWVyeTogZGVsZXRlUXVlcnkuYmluZCh0aGlzLCB0aGlzLmRhdGFBdHRyaWJ1dGVzLkRhdGFiYXNlVGFibGUsIHRoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllckZpZWxkLCB0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJWYWx1ZSksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQSBzdG9yZSBmb3IgZWxlbWVudHMgdXNlZCBpbiB0aGlzIGNvbXBvbmVudC5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cyA9IHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBjaGVja2JveCwgd2hpY2ggZGlzcGxheXMgdGhlIGN1cnJlbnQgc3RhdGUgb2YgXCJkYXRhQXR0cmlidXRlcy5Jc0NoZWNrZWRcIi5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIENoZWNrYm94SW5wdXQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0JyksXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIHNwYW4gZWxlbWVudCwgd2hpY2ggaGFzIHRhYmxlIGZpbHRlcmFibGUsIGludmlzaWJsZSB0ZXh0IGluc2lkZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIEZpbHRlclRleHRTcGFuOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coYGNoZWNrZWQ6ICR7dGhpcy5kYXRhQXR0cmlidXRlcy5Jc0NoZWNrZWR9YCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmRhdGFBdHRyaWJ1dGVzLklzQ2hlY2tlZCkgdGhpcy5zZXRDaGVja2VkKGZhbHNlKTtcclxuICAgICAgICBlbHNlIHRoaXMudW5zZXRDaGVja2VkKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0dXBNYXJrSW5wdXRFbGVtZW50KCk7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVDaGVja2JveElucHV0KCk7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVGaWx0ZXJFbGVtZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0dXBNYXJrSW5wdXRFbGVtZW50KCkge1xyXG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZChgbWFya2VyXyR7dGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWV9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgdGhlIGNoZWNrYm94IGlucHV0IGFuZCBhZGQgaXQgdG8gdGhpcyBDb21wb25lbnRzIEhUTUwgQ29udGV4dC5cclxuICAgICAqL1xyXG4gICAgY3JlYXRlQ2hlY2tib3hJbnB1dCgpIHtcclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cy5DaGVja2JveElucHV0LnR5cGUgPSAnY2hlY2tib3gnO1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQub25jbGljayA9IHRoaXMuY2xpY2tFdmVudEhhbmRsZXIuYmluZCh0aGlzKTtcclxuICAgICAgICBpZiAodGhpcy5kYXRhQXR0cmlidXRlcy5Jc0NoZWNrZWQpIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQudG9nZ2xlQXR0cmlidXRlKCdjaGVja2VkJywgdHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5hcHBlbmQodGhpcy5kYXRhRWxlbWVudHMuQ2hlY2tib3hJbnB1dCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgdGhlIHNwYW4sIHRoYXQgaXMgdXNlZCB0byBmaWx0ZXIgYW5kIHNvcnQgbWFya2VkIGRhdGEuXHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZUZpbHRlckVsZW1lbnQoKSB7XHJcbiAgICAgICAgbGV0IFttYXJrZWRUZXh0LCB1bm1hcmtlZFRleHRdID0gdGhpcy5kYXRhQXR0cmlidXRlcy5NYXJrZXJUZXh0LnNwbGl0KCd8Jyk7XHJcbiAgICAgICAgdGhpcy5kYXRhRWxlbWVudHMuRmlsdGVyVGV4dFNwYW4uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cy5GaWx0ZXJUZXh0U3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuZGF0YUF0dHJpYnV0ZXMuSXNDaGVja2VkID8gbWFya2VkVGV4dCA6IHVubWFya2VkVGV4dDtcclxuICAgICAgICB0aGlzLmFwcGVuZCh0aGlzLmRhdGFFbGVtZW50cy5GaWx0ZXJUZXh0U3Bhbik7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDaGFuZ2UgYWxsIG5lY2Fzc2FycnkgdmFsdWVzLCB3aGVuIHRoZSBzdGF0dXMgb2YgSXNDaGVja2VkIGNoYW5nZXMgdG8gdHJ1ZS5cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdXBkYXRlVGFibGUgLSB0cnVlIG1lYW5zIHRoZSByZXN0IG9mIHRoZSB0YWJsZSBpcyBnZXR0aW5nIGFuIHNldENoZWNrZWQoZmFsc2UpIGNhbGwuXHJcbiAgICAgKi9cclxuICAgIHNldENoZWNrZWQodXBkYXRlVGFibGUpIHtcclxuICAgICAgICBsZXQgW3NldE1hcmtlciwgdW5zZXRNYXJrZXJdID0gdGhpcy5kYXRhQXR0cmlidXRlcy5NYXJrZXJUZXh0LnNwbGl0KCd8Jyk7XHJcbiAgICAgICAgdGhpcy5kYXRhQXR0cmlidXRlcy5Jc0NoZWNrZWQgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMudG9nZ2xlQXR0cmlidXRlKCdjaGVja2VkJywgdHJ1ZSk7XHJcbiAgICAgICAgLy8gdGhpcy50b2dnbGVBdHRyaWJ1dGUoc2V0TWFya2VyLCB0cnVlKTtcclxuICAgICAgICAvLyB0aGlzLnJlbW92ZUF0dHJpYnV0ZSh1bnNldE1hcmtlcilcclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cy5DaGVja2JveElucHV0LnRvZ2dsZUF0dHJpYnV0ZSgnY2hlY2tlZCcsIHRydWUpO1xyXG4gICAgICAgIC8vIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQudG9nZ2xlQXR0cmlidXRlKHNldE1hcmtlciwgdHJ1ZSk7XHJcbiAgICAgICAgLy8gdGhpcy5kYXRhRWxlbWVudHMuQ2hlY2tib3hJbnB1dC5yZW1vdmVBdHRyaWJ1dGUoc2V0TWFya2VyKTtcclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cy5DaGVja2JveElucHV0LmNoZWNrZWQgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkZpbHRlclRleHRTcGFuLnRleHRDb250ZW50ID0gc2V0TWFya2VyO1xyXG4gICAgICAgIC8vIGlmICh1cGRhdGVUYWJsZSkgdGhpcy5kYXRhUHJvcGVydGllcy5QYXJlbnRUYWJsZS5kYXRhLmZpbHRlcigoZW50cnkpID0+IChjb25zb2xlLmxvZyhlbnRyeVsnbWFya2VyJ10pLCBlbnRyeVt0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJGaWVsZF0gPT0gdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWUpKS5tYXAoZW50cnkgPT4gKGVudHJ5WydtYXJrZXInXS5zZXRDaGVja2VkKGZhbHNlKSkpO1xyXG4gICAgICAgIGlmICh1cGRhdGVUYWJsZSkge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGAudGFibGUtaWQtJHt0aGlzLmRhdGFQcm9wZXJ0aWVzLlBhcmVudFRhYmxlLnRhYmxlSWR9IG1hcmstaW5wdXQubWFya2VyXyR7dGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWV9YCkuZm9yRWFjaCgobWFya2VyKSA9PiAobWFya2VyLnNldENoZWNrZWQoZmFsc2UpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TWFya2llcmVuRGF0YSh0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdGhpcy5wYXJlbnRFbGVtZW50Lm5leHRFbGVtZW50U2libGluZy50ZXh0Q29udGVudCA9ICdqYSc7XHJcbiAgICAgICAgdGhpcy5zZXRNYXJraWVydEZpZWxkKHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2hhbmdlIGFsbCBuZWNhc3NhcnJ5IHZhbHVlcywgd2hlbiB0aGUgc3RhdHVzIG9mIElzQ2hlY2tlZCBjaGFuZ2VzIHRvIGZhbHNlLlxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSB1cGRhdGVUYWJsZSAtIHRydWUgbWVhbnMgdGhlIHJlc3Qgb2YgdGhlIHRhYmxlIGlzIGdldHRpbmcgYW4gc2V0Q2hlY2tlZChmYWxzZSkgY2FsbC5cclxuICAgICAqL1xyXG4gICAgdW5zZXRDaGVja2VkKHVwZGF0ZVRhYmxlKSB7XHJcbiAgICAgICAgbGV0IFtzZXRNYXJrZXIsIHVuc2V0TWFya2VyXSA9IHRoaXMuZGF0YUF0dHJpYnV0ZXMuTWFya2VyVGV4dC5zcGxpdCgnfCcpO1xyXG4gICAgICAgIHRoaXMuZGF0YUF0dHJpYnV0ZXMuSXNDaGVja2VkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5yZW1vdmVBdHRyaWJ1dGUoJ2NoZWNrZWQnKTtcclxuICAgICAgICAvLyB0aGlzLnRvZ2dsZUF0dHJpYnV0ZSh1bnNldE1hcmtlcik7XHJcbiAgICAgICAgLy8gdGhpcy5yZW1vdmVBdHRyaWJ1dGUoc2V0TWFya2VyKTtcclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cy5DaGVja2JveElucHV0LnJlbW92ZUF0dHJpYnV0ZSgnY2hlY2tlZCcpO1xyXG4gICAgICAgIC8vIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQudG9nZ2xlQXR0cmlidXRlKHVuc2V0TWFya2VyKTtcclxuICAgICAgICAvLyB0aGlzLmRhdGFFbGVtZW50cy5DaGVja2JveElucHV0LnJlbW92ZUF0dHJpYnV0ZShzZXRNYXJrZXIpO1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQuY2hlY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkZpbHRlclRleHRTcGFuLnRleHRDb250ZW50ID0gdW5zZXRNYXJrZXI7XHJcbiAgICAgICAgLy8gaWYgKHVwZGF0ZVRhYmxlKSB0aGlzLmRhdGFQcm9wZXJ0aWVzLlBhcmVudFRhYmxlLmRhdGEuZmlsdGVyKChlbnRyeSkgPT4gKGVudHJ5W3RoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllckZpZWxkXSA9PSB0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJWYWx1ZSkpLm1hcChlbnRyeSA9PiAoZW50cnlbdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyRmllbGRdLnVuc2V0Q2hlY2tlZChmYWxzZSkpKTtcclxuICAgICAgICBpZiAodXBkYXRlVGFibGUpIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChgLnRhYmxlLWlkLSR7dGhpcy5kYXRhUHJvcGVydGllcy5QYXJlbnRUYWJsZS50YWJsZUlkfSBtYXJrLWlucHV0Lm1hcmtlcl8ke3RoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllclZhbHVlfWApLmZvckVhY2goKG1hcmtlcikgPT4gKG1hcmtlci51bnNldENoZWNrZWQoZmFsc2UpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TWFya2llcmVuRGF0YShmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc2V0TWFya2llcnRGaWVsZChmYWxzZSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0TWFya2llcmVuRGF0YShib29sKSB7XHJcbiAgICAgICAgdGhpcy5kYXRhUHJvcGVydGllcy5QYXJlbnRUYWJsZS5kYXRhID0gdGhpcy5kYXRhUHJvcGVydGllcy5QYXJlbnRUYWJsZS5kYXRhLm1hcChlbnRyeSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlbnRyeVt0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJGaWVsZF0gPT0gdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIGVudHJ5WycjbWFya2llcnQnXSA9IGJvb2wgPyAnamEnIDogJ25laW4nO1xyXG4gICAgICAgICAgICAgICAgZW50cnlbJ21hcmtlciddID0gdGhpcy5kYXRhUHJvcGVydGllcy5QYXJlbnRUYWJsZS5jcmVhdGVNYXJrSW5wdXQoXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyRmllbGQsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZVRhYmxlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0YUF0dHJpYnV0ZXMuRGF0YWJhc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZVVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhQXR0cmlidXRlcy5NYXJrZXJUZXh0LFxyXG4gICAgICAgICAgICAgICAgICAgIGJvb2xcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGVudHJ5O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHNldE1hcmtpZXJ0RmllbGQoYm9vbCkge1xyXG4gICAgICAgIGxldCBuZXh0U2libGluZyA9IHRoaXMucGFyZW50RWxlbWVudC5uZXh0RWxlbWVudFNpYmxpbmc7XHJcbiAgICAgICAgaWYgKG5leHRTaWJsaW5nICYmIG5leHRTaWJsaW5nLmNsYXNzTGlzdC5jb250YWlucygnd2d0LWNvbHVtbl8jbWFya2llcnQnKSkge1xyXG4gICAgICAgICAgICBuZXh0U2libGluZy50ZXh0Q29udGVudCA9IGJvb2wgPyAnamEnIDogJ25laW4nO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSB0aGUgdGFibGUgaW4gU1FMU2VydmVyLCBpZiBpdCBkb2Vzbid0IGFscmVhZHkgZXhpc3QuXHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZVRhYmxlKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuZGF0YVByb3BlcnRpZXMuQ3JlYXRlVGFibGVRdWVyeSgpKTtcclxuICAgICAgICBmZXRjaCh0aGlzLmRhdGFQcm9wZXJ0aWVzLkRhdGFiYXNlVXJsLCB7XHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcixcclxuICAgICAgICAgICAgICAgIGJvZHk6IGNyZWF0ZUZldGNoQm9keSh0aGlzLmRhdGFQcm9wZXJ0aWVzLkNyZWF0ZVRhYmxlUXVlcnkpLFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZmluaXNoZWQgdGFibGUgY3JlYXRlIHF1ZXJ5LicpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEhhbmRsZXMgdGhlIGNsaWNrIGV2ZW50IG9uIHRoZSBjaGVja2JveCBlbGVtZW50LlxyXG4gICAgICogQHBhcmFtIHtDbGlja0V2ZW50fSBldmVudCBcclxuICAgICAqL1xyXG4gICAgY2xpY2tFdmVudEhhbmRsZXIoZXZlbnQpIHtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIGlmICh0aGlzLmRhdGFBdHRyaWJ1dGVzLklzQ2hlY2tlZCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmRhdGFQcm9wZXJ0aWVzLkRlbGV0ZUZyb21RdWVyeSgpKTtcclxuICAgICAgICAgICAgZmV0Y2godGhpcy5kYXRhUHJvcGVydGllcy5EYXRhYmFzZVVybCwge1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcixcclxuICAgICAgICAgICAgICAgICAgICBib2R5OiBjcmVhdGVGZXRjaEJvZHkodGhpcy5kYXRhUHJvcGVydGllcy5EZWxldGVGcm9tUXVlcnkpLFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5zZXRDaGVja2VkKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5kYXRhUHJvcGVydGllcy5JbnNlcnRWYWx1ZXNRdWVyeSgpKTtcclxuICAgICAgICAgICAgZmV0Y2godGhpcy5kYXRhUHJvcGVydGllcy5EYXRhYmFzZVVybCwge1xyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcixcclxuICAgICAgICAgICAgICAgICAgICBib2R5OiBjcmVhdGVGZXRjaEJvZHkodGhpcy5kYXRhUHJvcGVydGllcy5JbnNlcnRWYWx1ZXNRdWVyeSksXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRDaGVja2VkKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogRmV0Y2hlcyB0aGUgbGlzdCBvZiBjaGVja2VkIHZhbHVlcy5cclxuICogQHBhcmFtIHtzdHJpbmd9IGRiIC0gZGF0YWJhc2UgbmFtZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZGJ1c2VyIC0gZGF0YWJhc2UgdXNlclxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZGJUYWJsZSAtIGRhdGFiYXNlIHRhYmxlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZEZpZWxkIC0gaWRlbnRpZmllciBmaWVsZFxyXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxhbnk+fSAtIGEgcHJvbWlzZSBvZiB0aGUgcmVjZWl2ZWQganNvbiBsaXN0IFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hTZWxlY3RDaGVja2VkVmFsdWVzKGRiLCBkYnVzZXIsIGRiVGFibGUsIGlkRmllbGQpIHtcclxuICAgIHJldHVybiBmZXRjaChkYXRhYmFzZVVybChkYiwgZGJ1c2VyKSwge1xyXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgaGVhZGVyczogaGVhZGVyLFxyXG4gICAgICAgICAgICBib2R5OiBjcmVhdGVGZXRjaEJvZHkoc2VsZWN0Q2hlY2tlZEZvckFsbC5iaW5kKHRoaXMsIGRiVGFibGUsIGlkRmllbGQpKSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIC50aGVuKHJlc3BvbnNlID0+IChyZXNwb25zZS5qc29uKCkpKVxyXG4gICAgICAgIC50aGVuKGRhdGEgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICB9KTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZmV0Y2hDcmVhdGVUYWJsZUlmTm90RXhpc3RzKGRiLCBkYnVzZXIsIGRiVGFibGUpIHtcclxuICAgIHJldHVybiBmZXRjaChkYXRhYmFzZVVybChkYiwgZGJ1c2VyKSwge1xyXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgaGVhZGVyczogaGVhZGVyLFxyXG4gICAgICAgICAgICBib2R5OiBjcmVhdGVGZXRjaEJvZHkoY3JlYXRlVGFibGVRdWVyeS5iaW5kKHRoaXMsIGRiVGFibGUpKSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIC50aGVuKHJlc3BvbnNlID0+IChyZXNwb25zZS5qc29uKCkpKVxyXG4gICAgICAgIC50aGVuKGRhdGEgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICB9KTtcclxufVxyXG5cclxuLy8gY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdtYXJrLWlucHV0JywgTWFya0lucHV0KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgTWFya0lucHV0LFxyXG4gICAgZmV0Y2hTZWxlY3RDaGVja2VkVmFsdWVzLFxyXG4gICAgZmV0Y2hDcmVhdGVUYWJsZUlmTm90RXhpc3RzLFxyXG59OyIsImxldCB3Y0dyaWRUYWJsZSA9IHJlcXVpcmUoXCJ3Yy1ncmlkLXRhYmxlL3NyYy93Yy1ncmlkLXRhYmxlLmpzXCIpO1xyXG5sZXQgZGVib3VuY2UgPSByZXF1aXJlKCdsb2Rhc2guZGVib3VuY2UnKTtcclxubGV0IHsgTWFya0lucHV0LCBmZXRjaFNlbGVjdENoZWNrZWRWYWx1ZXMsIGZldGNoQ3JlYXRlVGFibGVJZk5vdEV4aXN0cyB9ID0gcmVxdWlyZShcIi4vTWFya0lucHV0XCIpO1xyXG5cclxucmVxdWlyZSgnLi9zdHlsZS5jc3MnKTtcclxuLy8gd2NHcmlkVGFibGUuZGVmaW5lQ3VzdG9tRWxlbWVudCgpXHJcblxyXG5jbGFzcyBQcm90VGFibGUgZXh0ZW5kcyB3Y0dyaWRUYWJsZS5UYWJsZUNvbXBvbmVudCB7XHJcbiAgICB1c2VEZWZhdWx0T3B0aW9ucygpIHtcclxuICAgICAgICBzdXBlci51c2VEZWZhdWx0T3B0aW9ucygpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcclxuICAgICAgICBzdXBlci5jb25uZWN0ZWRDYWxsYmFjaygpO1xyXG5cclxuICAgICAgICBsZXQgaGVpZ2h0ID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpO1xyXG4gICAgICAgIGxldCBwYWdlU2l6ZSA9IHRoaXMuZ2V0QXR0cmlidXRlKCdwYWdlLXNpemUnKTtcclxuXHJcbiAgICAgICAgaWYgKGhlaWdodCkgdGhpcy5zdHlsZS5tYXhIZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICAgICAgaWYgKHBhZ2VTaXplKSB7XHJcbiAgICAgICAgICAgIC8vIHRoaXMucGFnaW5hdGlvbi5wYWdlU2l6ZSA9IE51bWJlci5wYXJzZUludChwYWdlU2l6ZSk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMub3B0aW9ucy5wYWdpbmF0aW9uLnBhZ2VTaXplID0gcGFnZVNpemU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5wYWdpbmF0aW9uLnBhZ2VTaXplID0gNTAwO1xyXG4gICAgICAgICAgICAvLyB0aGlzLm9wdGlvbnMucGFnaW5hdGlvbi5wYWdlU2l6ZSA9IDUwMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB0YWJzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnZGl2LnRhYnMgZGl2LnRhYi1wYW5lJyk7XHJcbiAgICAgICAgWy4uLnRhYnNdLmZvckVhY2goKHRhYikgPT4ge1xyXG4gICAgICAgICAgICB0YWIuYWRkQ2xhc3MgPSBuZXcgUHJveHkodGFiLmFkZENsYXNzLCB7XHJcbiAgICAgICAgICAgICAgICBhcHBseTogZnVuY3Rpb24odGFyZ2V0LCB0aGlzQXJnLCBhcmdMaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2FkZENsYXNzIGZpeC1jb2x1bW5zJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2ZpeC1jb2x1bW5zJyB9KSwgJyonKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0LmFwcGx5KHRoaXNBcmcsIGFyZ0xpc3QpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIC8vIGZldGNoKCdodHRwOi8vMTAuMTkuMjguOTQ6NTk4NS9hbmdfcHJvdC13aWtpL3Byb3Qtd2lraV9MZWdlbmRlJylcclxuICAgICAgICBmZXRjaCgnaHR0cHM6Ly9kYXRhYmFzZS5wcm90cm9uaWMtZ21iaC5kZS9xdWVyeT9kYXRhYmFzZT1mb3JtbHknLCB7XHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYm9keTogYHtcInF1ZXJ5XCI6IFwiU0VMRUNUIFtzeW5vbnltXSwgW2xpbmtdLCBbdG9vbHRpcF0gRlJPTSBzY2hlbWFBdXNrdW5mdExpbmtzO1wifWBcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZm9ybWF0dGVyUmVzdWx0ID0ge307XHJcbiAgICAgICAgICAgICAgICBsZXQgbGlua3MgPSByZXNwb25zZS5tYXAoZW50cnkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdFbnRyeSA9IHt9XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3RW50cnlbZW50cnkuc3lub255bV0gPSBlbnRyeS5saW5rO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXdFbnRyeTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbGlua3MuZm9yRWFjaChsaW5rID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhsaW5rKS5mb3JFYWNoKGtleSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCB0bXAgPSBsaW5rW2tleV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZm9ybWF0dGVyUmVzdWx0W2tleV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlclJlc3VsdFtrZXldID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVyUmVzdWx0W2tleV0ucHVzaCgodmFsdWUpID0+ICh2YWx1ZS5zdGFydHNXaXRoKCc8JykgPyB2YWx1ZSA6IGA8YSBocmVmPVwiJHtsaW5rW2tleV19JHt2YWx1ZX1cIj4ke3ZhbHVlfTwvYT5gKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGZvcm1hdHRlclJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZvcm1hdHRlciA9IGZvcm1hdHRlclJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dXBQcm90VGFibGVEYXRhKCk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5jYXRjaChlcnIgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjYXVnaHQuXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXR1cFByb3RUYWJsZURhdGEoKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGxvYWREYXRhRnJvbVF1ZXJ5KHF1ZXJ5KSB7XHJcbiAgICAgICAgcXVlcnkgPSBkZWNvZGVVUklDb21wb25lbnQocXVlcnkucmVwbGFjZSgvXFxcXG4vZywgJ1xcbicpKTtcclxuXHJcbiAgICAgICAgbGV0IGZldGNoT3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHF1ZXJ5OiBxdWVyeSB9KVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGZldGNoKCdodHRwczovL2RhdGFiYXNlLnByb3Ryb25pYy1nbWJoLmRlL3F1ZXJ5P2RhdGFiYXNlPU9MUmV3ZUFiZicsIGZldGNoT3B0aW9ucylcclxuICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAgICAgICAudGhlbihqc29uUmVzcCA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhqc29uUmVzcCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldHVwTWFya0lucHV0cyhqc29uUmVzcClcclxuICAgICAgICAgICAgICAgICAgICAudGhlbihtYXJrRGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtEYXRhLmZvckVhY2godiA9PiBkZWxldGUgdi5ST1dTVEFUKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXREYXRhKG1hcmtEYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0dXBQcm90VGFibGVEYXRhKCkge1xyXG5cclxuICAgICAgICBsZXQganNvblVybCA9IHRoaXMuZ2V0QXR0cmlidXRlKCdkYXRhX3VybCcpO1xyXG4gICAgICAgIGpzb25VcmwgPSBqc29uVXJsLnJlcGxhY2UoL15bYS16QS1aXSo6XFwvXFwvW2EtekEtWjAtOS4tXSovLCAnJyk7XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3F1ZXJ5Jyk7XHJcblxyXG4gICAgICAgIGlmIChqc29uVXJsKSB7XHJcbiAgICAgICAgICAgIGZldGNoKGpzb25VcmwpXHJcbiAgICAgICAgICAgICAgICAudGhlbihkYXRhID0+IGRhdGEuanNvbigpKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR1cE1hcmtJbnB1dHMoZGF0YSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4obWFya0RhdGEgPT4gdGhpcy5zZXREYXRhKG1hcmtEYXRhKSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHF1ZXJ5KSB7XHJcbiAgICAgICAgICAgIGxvYWREYXRhRnJvbVF1ZXJ5KHF1ZXJ5KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2V0RGVib3VuY2VGbihkZWJvdW5jZSwgWzIwMCwgeyBsZWFkaW5nOiB0cnVlLCB0cmFpbGluZzogZmFsc2UgfV0sIFs1MDAsIHsgdHJhaWxpbmc6IHRydWUsIGxlYWRpbmc6IGZhbHNlIH1dKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2V0cyB1cCB0aGUgbWFya2VyIGNvbHVtbiwgYnV0IG9ubHkgd2hlbiBhbGwgb2YgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZXMgZXhpc3QuXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIHRhYmxlIGRhdGFcclxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gdGFibGUgZGF0YVxyXG4gICAgICovXHJcbiAgICBhc3luYyBzZXR1cE1hcmtJbnB1dHMoZGF0YSkge1xyXG4gICAgICAgIGNvbnN0IHJlcXVpcmVkQXR0cmlidXRlcyA9IHtcclxuICAgICAgICAgICAgaWRlbnRpZmllckZpZWxkOiB0aGlzLmdldEF0dHJpYnV0ZSgnbWFya2VyLWlkZW50aWZpZXJmaWVsZCcpLFxyXG4gICAgICAgICAgICBkYXRhYmFzZVRhYmxlOiB0aGlzLmdldEF0dHJpYnV0ZSgnbWFya2VyLWRhdGFiYXNldGFibGUnKSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBvcHRpb25hbEF0dHJpYnV0ZXMgPSB7XHJcbiAgICAgICAgICAgIGRhdGFiYXNlOiB0aGlzLmdldEF0dHJpYnV0ZSgnbWFya2VyLWRhdGFiYXNlJykgPyB0aGlzLmdldEF0dHJpYnV0ZSgnbWFya2VyLWRhdGFiYXNlJykgOiBcIk1hcmtlckRCXCIsXHJcbiAgICAgICAgICAgIGRhdGFiYXNldXNlcjogdGhpcy5nZXRBdHRyaWJ1dGUoJ21hcmtlci1kYXRhYmFzZXVzZXInKSA/IHRoaXMuZ2V0QXR0cmlidXRlKCdtYXJrZXItZGF0YWJhc2V1c2VyJykgOiBcIndpa2lcIixcclxuICAgICAgICAgICAgbWFya2VyVGV4dDogdGhpcy5nZXRBdHRyaWJ1dGUoJ21hcmtlci1tYXJrZXJ0ZXh0JyksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKFJlZmxlY3Qub3duS2V5cyhyZXF1aXJlZEF0dHJpYnV0ZXMpLm1hcCgoa2V5KSA9PiByZXF1aXJlZEF0dHJpYnV0ZXNba2V5XSkuZXZlcnkoKHZhbHVlKSA9PiAodmFsdWUgPT0gdW5kZWZpbmVkID8gZmFsc2UgOiB0cnVlKSkpIHtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIGF3YWl0IGZldGNoQ3JlYXRlVGFibGVJZk5vdEV4aXN0cyhvcHRpb25hbEF0dHJpYnV0ZXMuZGF0YWJhc2UsIG9wdGlvbmFsQXR0cmlidXRlcy5kYXRhYmFzZXVzZXIsIHJlcXVpcmVkQXR0cmlidXRlcy5kYXRhYmFzZVRhYmxlKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGVNYXJrSW5wdXREYXRhKGRhdGEsIHJlcXVpcmVkQXR0cmlidXRlcywgb3B0aW9uYWxBdHRyaWJ1dGVzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGVzIGEgTWFya0lucHV0IGVsZW1lbnQuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWRlbnRpZmllckZpZWxkXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWRlbnRpZmllclZhbHVlXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGFibGVuYW1lXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGF0YWJhc2VcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkYnVzZXJcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtYXJrZXJcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gY2hlY2tlZFxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBNYXJrSW5wdXQgb3V0ZXIgaHRtbFxyXG4gICAgICovXHJcbiAgICBjcmVhdGVNYXJrSW5wdXQoaWRlbnRpZmllckZpZWxkLCBpZGVudGlmaWVyVmFsdWUsIHRhYmxlbmFtZSwgZGF0YWJhc2UsIGRidXNlciwgbWFya2VyLCBjaGVja2VkKSB7XHJcbiAgICAgICAgbGV0IG1hcmtJbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ21hcmstaW5wdXQnKTtcclxuICAgICAgICBtYXJrSW5wdXQuc2V0QXR0cmlidXRlKCdpZGVudGlmaWVyZmllbGQnLCBpZGVudGlmaWVyRmllbGQpO1xyXG4gICAgICAgIG1hcmtJbnB1dC5zZXRBdHRyaWJ1dGUoJ2lkZW50aWZpZXJ2YWx1ZScsIGlkZW50aWZpZXJWYWx1ZSk7XHJcbiAgICAgICAgaWYgKHRhYmxlbmFtZSkgbWFya0lucHV0LnNldEF0dHJpYnV0ZSgnZGF0YWJhc2V0YWJsZScsIHRhYmxlbmFtZSk7XHJcbiAgICAgICAgaWYgKGRhdGFiYXNlKSBtYXJrSW5wdXQuc2V0QXR0cmlidXRlKCdkYXRhYmFzZScsIGRhdGFiYXNlKTtcclxuICAgICAgICBpZiAoZGJ1c2VyKSBtYXJrSW5wdXQuc2V0QXR0cmlidXRlKCdkYXRhYmFzZXVzZXInLCBkYnVzZXIpO1xyXG4gICAgICAgIGlmIChtYXJrZXIpIG1hcmtJbnB1dC5zZXRBdHRyaWJ1dGUoJ21hcmtlcnRleHQnLCBtYXJrZXIpO1xyXG4gICAgICAgIGlmIChjaGVja2VkKSBtYXJrSW5wdXQudG9nZ2xlQXR0cmlidXRlKCdjaGVja2VkJywgY2hlY2tlZCk7XHJcbiAgICAgICAgcmV0dXJuIG1hcmtJbnB1dC5vdXRlckhUTUw7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZW5lcmF0ZXMgdGhlIGRhdGEgZm9yIHRoZSB0YWJsZSwgd2hpY2ggaW5jbHVkZXMgYSByb3cgd2l0aCBNYXJrZXJJbnB1dHMuXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIHRhYmxlIGRhdGFcclxuICAgICAqIEBwYXJhbSB7e2lkZW50aWZpZXJGaWVsZDogc3RyaW5nLCBkYXRhYmFzZVRhYmxlOiBzdHJpbmd9fSByZXFBdHRyIC0gcmVxdWlyZWQgTWFya0lucHV0IGF0dHJpYnV0ZXNcclxuICAgICAqIEBwYXJhbSB7e2RhdGFiYXNlPzogc3RyaW5nLCBkYXRhYmFzZXVzZXI/OiBzdHJpbmcsIG1hcmtlclRleHQ/OiBzdHJpbmd9fSBvcHRBdHRyIC0gb3B0aW9uYWwgTWFya0lucHV0IGF0dHJpYnV0ZXNcclxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gdGFibGUgZGF0YVxyXG4gICAgICovXHJcbiAgICBhc3luYyBnZW5lcmF0ZU1hcmtJbnB1dERhdGEoZGF0YSwgcmVxQXR0ciwgb3B0QXR0cikge1xyXG4gICAgICAgIGxldCB7IGlkZW50aWZpZXJGaWVsZCwgZGF0YWJhc2VUYWJsZSB9ID0gcmVxQXR0cjtcclxuICAgICAgICBsZXQgeyBkYXRhYmFzZSwgZGF0YWJhc2V1c2VyLCBtYXJrZXJUZXh0IH0gPSBvcHRBdHRyO1xyXG5cclxuICAgICAgICAvLyBkYXRhYmFzZVRhYmxlID0gZGF0YWJhc2VUYWJsZSA/IGRhdGFiYXNlVGFibGUgOiBcIkRlZmF1bHRUYWJsZVwiO1xyXG4gICAgICAgIC8vIG1hcmtlclRleHQgPSBtYXJrZXJUZXh0ID8gbWFya2VyVGV4dCA6IFwiampqfG5ublwiO1xyXG5cclxuICAgICAgICByZXR1cm4gZmV0Y2hTZWxlY3RDaGVja2VkVmFsdWVzKGRhdGFiYXNlLCBkYXRhYmFzZXVzZXIsIGRhdGFiYXNlVGFibGUsIGlkZW50aWZpZXJGaWVsZClcclxuICAgICAgICAgICAgLnRoZW4oKGNoZWNrZWREYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tYXAoKGVudHJ5KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNoZWNrZWQgPSBjaGVja2VkRGF0YS5tYXAoKHZhbHVlKSA9PiB2YWx1ZS5pZGVudGlmaWVyVmFsdWUpLmluY2x1ZGVzKGVudHJ5W2lkZW50aWZpZXJGaWVsZF0udG9TdHJpbmcoKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdtYXJrZXInOiB0aGlzLmNyZWF0ZU1hcmtJbnB1dChpZGVudGlmaWVyRmllbGQsIGVudHJ5W2lkZW50aWZpZXJGaWVsZF0udG9TdHJpbmcoKSwgZGF0YWJhc2VUYWJsZSwgZGF0YWJhc2UsIGRhdGFiYXNldXNlciwgbWFya2VyVGV4dCwgY2hlY2tlZCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICcjbWFya2llcnQnOiBjaGVja2VkID8gJ2phJyA6ICduZWluJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgLi4uZW50cnksXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5cclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdtYXJrLWlucHV0JywgTWFya0lucHV0KTtcclxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdwcm90LXRhYmxlLXYzJywgUHJvdFRhYmxlKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgUHJvdFRhYmxlOiBQcm90VGFibGUsXHJcbiAgICBUYWJsZUNvbXBvbmVudDogd2NHcmlkVGFibGUuVGFibGVDb21wb25lbnQsXHJcbn07IiwiJ3VzZSBzdHJpY3QnO1xuLy8gRm9yIG1vcmUgaW5mb3JtYXRpb24gYWJvdXQgYnJvd3NlciBmaWVsZCwgY2hlY2sgb3V0IHRoZSBicm93c2VyIGZpZWxkIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9zdWJzdGFjay9icm93c2VyaWZ5LWhhbmRib29rI2Jyb3dzZXItZmllbGQuXG5cbnZhciBzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcCA9IFtdO1xuXG52YXIgaW5zZXJ0U3R5bGVFbGVtZW50ID0gZnVuY3Rpb24oc3R5bGVFbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdmFyIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG4gICAgdmFyIGxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wID0gc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3Bbc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AubGVuZ3RoIC0gMV07XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zLmluc2VydEF0ID0gb3B0aW9ucy5pbnNlcnRBdCB8fCAnYm90dG9tJztcblxuICAgIGlmIChvcHRpb25zLmluc2VydEF0ID09PSAndG9wJykge1xuICAgICAgICBpZiAoIWxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wKSB7XG4gICAgICAgICAgICBoZWFkLmluc2VydEJlZm9yZShzdHlsZUVsZW1lbnQsIGhlYWQuZmlyc3RDaGlsZCk7XG4gICAgICAgIH0gZWxzZSBpZiAobGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3AubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgICAgIGhlYWQuaW5zZXJ0QmVmb3JlKHN0eWxlRWxlbWVudCwgbGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3AubmV4dFNpYmxpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGVhZC5hcHBlbmRDaGlsZChzdHlsZUVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHN0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wLnB1c2goc3R5bGVFbGVtZW50KTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaW5zZXJ0QXQgPT09ICdib3R0b20nKSB7XG4gICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGVFbGVtZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdmFsdWUgZm9yIHBhcmFtZXRlciBcXCdpbnNlcnRBdFxcJy4gTXVzdCBiZSBcXCd0b3BcXCcgb3IgXFwnYm90dG9tXFwnLicpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIC8vIENyZWF0ZSBhIDxsaW5rPiB0YWcgd2l0aCBvcHRpb25hbCBkYXRhIGF0dHJpYnV0ZXNcbiAgICBjcmVhdGVMaW5rOiBmdW5jdGlvbihocmVmLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHZhciBoZWFkID0gZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdO1xuICAgICAgICB2YXIgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcblxuICAgICAgICBsaW5rLmhyZWYgPSBocmVmO1xuICAgICAgICBsaW5rLnJlbCA9ICdzdHlsZXNoZWV0JztcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgICAgICAgICAgaWYgKCAhIGF0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHZhbHVlID0gYXR0cmlidXRlc1trZXldO1xuICAgICAgICAgICAgbGluay5zZXRBdHRyaWJ1dGUoJ2RhdGEtJyArIGtleSwgdmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaGVhZC5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICB9LFxuICAgIC8vIENyZWF0ZSBhIDxzdHlsZT4gdGFnIHdpdGggb3B0aW9uYWwgZGF0YSBhdHRyaWJ1dGVzXG4gICAgY3JlYXRlU3R5bGU6IGZ1bmN0aW9uKGNzc1RleHQsIGF0dHJpYnV0ZXMsIGV4dHJhT3B0aW9ucykge1xuICAgICAgICBleHRyYU9wdGlvbnMgPSBleHRyYU9wdGlvbnMgfHwge307XG5cbiAgICAgICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgICAgc3R5bGUudHlwZSA9ICd0ZXh0L2Nzcyc7XG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGlmICggISBhdHRyaWJ1dGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNba2V5XTtcbiAgICAgICAgICAgIHN0eWxlLnNldEF0dHJpYnV0ZSgnZGF0YS0nICsga2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3R5bGUuc2hlZXQpIHsgLy8gZm9yIGpzZG9tIGFuZCBJRTkrXG4gICAgICAgICAgICBzdHlsZS5pbm5lckhUTUwgPSBjc3NUZXh0O1xuICAgICAgICAgICAgc3R5bGUuc2hlZXQuY3NzVGV4dCA9IGNzc1RleHQ7XG4gICAgICAgICAgICBpbnNlcnRTdHlsZUVsZW1lbnQoc3R5bGUsIHsgaW5zZXJ0QXQ6IGV4dHJhT3B0aW9ucy5pbnNlcnRBdCB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChzdHlsZS5zdHlsZVNoZWV0KSB7IC8vIGZvciBJRTggYW5kIGJlbG93XG4gICAgICAgICAgICBpbnNlcnRTdHlsZUVsZW1lbnQoc3R5bGUsIHsgaW5zZXJ0QXQ6IGV4dHJhT3B0aW9ucy5pbnNlcnRBdCB9KTtcbiAgICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzc1RleHQ7XG4gICAgICAgIH0gZWxzZSB7IC8vIGZvciBDaHJvbWUsIEZpcmVmb3gsIGFuZCBTYWZhcmlcbiAgICAgICAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzc1RleHQpKTtcbiAgICAgICAgICAgIGluc2VydFN0eWxlRWxlbWVudChzdHlsZSwgeyBpbnNlcnRBdDogZXh0cmFPcHRpb25zLmluc2VydEF0IH0pO1xuICAgICAgICB9XG4gICAgfVxufTtcbiIsIi8qKlxuICogbG9kYXNoIChDdXN0b20gQnVpbGQpIDxodHRwczovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBleHBvcnRzPVwibnBtXCIgLW8gLi9gXG4gKiBDb3B5cmlnaHQgalF1ZXJ5IEZvdW5kYXRpb24gYW5kIG90aGVyIGNvbnRyaWJ1dG9ycyA8aHR0cHM6Ly9qcXVlcnkub3JnLz5cbiAqIFJlbGVhc2VkIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwczovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS44LjMgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqL1xuXG4vKiogVXNlZCBhcyB0aGUgYFR5cGVFcnJvcmAgbWVzc2FnZSBmb3IgXCJGdW5jdGlvbnNcIiBtZXRob2RzLiAqL1xudmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcblxuLyoqIFVzZWQgYXMgcmVmZXJlbmNlcyBmb3IgdmFyaW91cyBgTnVtYmVyYCBjb25zdGFudHMuICovXG52YXIgTkFOID0gMCAvIDA7XG5cbi8qKiBgT2JqZWN0I3RvU3RyaW5nYCByZXN1bHQgcmVmZXJlbmNlcy4gKi9cbnZhciBzeW1ib2xUYWcgPSAnW29iamVjdCBTeW1ib2xdJztcblxuLyoqIFVzZWQgdG8gbWF0Y2ggbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZS4gKi9cbnZhciByZVRyaW0gPSAvXlxccyt8XFxzKyQvZztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGJhZCBzaWduZWQgaGV4YWRlY2ltYWwgc3RyaW5nIHZhbHVlcy4gKi9cbnZhciByZUlzQmFkSGV4ID0gL15bLStdMHhbMC05YS1mXSskL2k7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBiaW5hcnkgc3RyaW5nIHZhbHVlcy4gKi9cbnZhciByZUlzQmluYXJ5ID0gL14wYlswMV0rJC9pO1xuXG4vKiogVXNlZCB0byBkZXRlY3Qgb2N0YWwgc3RyaW5nIHZhbHVlcy4gKi9cbnZhciByZUlzT2N0YWwgPSAvXjBvWzAtN10rJC9pO1xuXG4vKiogQnVpbHQtaW4gbWV0aG9kIHJlZmVyZW5jZXMgd2l0aG91dCBhIGRlcGVuZGVuY3kgb24gYHJvb3RgLiAqL1xudmFyIGZyZWVQYXJzZUludCA9IHBhcnNlSW50O1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYGdsb2JhbGAgZnJvbSBOb2RlLmpzLiAqL1xudmFyIGZyZWVHbG9iYWwgPSB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbCAmJiBnbG9iYWwuT2JqZWN0ID09PSBPYmplY3QgJiYgZ2xvYmFsO1xuXG4vKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYHNlbGZgLiAqL1xudmFyIGZyZWVTZWxmID0gdHlwZW9mIHNlbGYgPT0gJ29iamVjdCcgJiYgc2VsZiAmJiBzZWxmLk9iamVjdCA9PT0gT2JqZWN0ICYmIHNlbGY7XG5cbi8qKiBVc2VkIGFzIGEgcmVmZXJlbmNlIHRvIHRoZSBnbG9iYWwgb2JqZWN0LiAqL1xudmFyIHJvb3QgPSBmcmVlR2xvYmFsIHx8IGZyZWVTZWxmIHx8IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5cbi8qKiBVc2VkIGZvciBidWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKlxuICogVXNlZCB0byByZXNvbHZlIHRoZVxuICogW2B0b1N0cmluZ1RhZ2BdKGh0dHA6Ly9lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLW9iamVjdC5wcm90b3R5cGUudG9zdHJpbmcpXG4gKiBvZiB2YWx1ZXMuXG4gKi9cbnZhciBvYmplY3RUb1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKiBCdWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXG52YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXG4gICAgbmF0aXZlTWluID0gTWF0aC5taW47XG5cbi8qKlxuICogR2V0cyB0aGUgdGltZXN0YW1wIG9mIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgaGF2ZSBlbGFwc2VkIHNpbmNlXG4gKiB0aGUgVW5peCBlcG9jaCAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDIuNC4wXG4gKiBAY2F0ZWdvcnkgRGF0ZVxuICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgdGltZXN0YW1wLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmRlZmVyKGZ1bmN0aW9uKHN0YW1wKSB7XG4gKiAgIGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7XG4gKiB9LCBfLm5vdygpKTtcbiAqIC8vID0+IExvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGludm9jYXRpb24uXG4gKi9cbnZhciBub3cgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHJvb3QuRGF0ZS5ub3coKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIGRlYm91bmNlZCBmdW5jdGlvbiB0aGF0IGRlbGF5cyBpbnZva2luZyBgZnVuY2AgdW50aWwgYWZ0ZXIgYHdhaXRgXG4gKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcbiAqIGludm9rZWQuIFRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gY29tZXMgd2l0aCBhIGBjYW5jZWxgIG1ldGhvZCB0byBjYW5jZWxcbiAqIGRlbGF5ZWQgYGZ1bmNgIGludm9jYXRpb25zIGFuZCBhIGBmbHVzaGAgbWV0aG9kIHRvIGltbWVkaWF0ZWx5IGludm9rZSB0aGVtLlxuICogUHJvdmlkZSBgb3B0aW9uc2AgdG8gaW5kaWNhdGUgd2hldGhlciBgZnVuY2Agc2hvdWxkIGJlIGludm9rZWQgb24gdGhlXG4gKiBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC4gVGhlIGBmdW5jYCBpcyBpbnZva2VkXG4gKiB3aXRoIHRoZSBsYXN0IGFyZ3VtZW50cyBwcm92aWRlZCB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uLiBTdWJzZXF1ZW50XG4gKiBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0IGBmdW5jYFxuICogaW52b2NhdGlvbi5cbiAqXG4gKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzXG4gKiBpbnZva2VkIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIGRlYm91bmNlZCBmdW5jdGlvblxuICogaXMgaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxuICpcbiAqIElmIGB3YWl0YCBpcyBgMGAgYW5kIGBsZWFkaW5nYCBpcyBgZmFsc2VgLCBgZnVuY2AgaW52b2NhdGlvbiBpcyBkZWZlcnJlZFxuICogdW50aWwgdG8gdGhlIG5leHQgdGljaywgc2ltaWxhciB0byBgc2V0VGltZW91dGAgd2l0aCBhIHRpbWVvdXQgb2YgYDBgLlxuICpcbiAqIFNlZSBbRGF2aWQgQ29yYmFjaG8ncyBhcnRpY2xlXShodHRwczovL2Nzcy10cmlja3MuY29tL2RlYm91bmNpbmctdGhyb3R0bGluZy1leHBsYWluZWQtZXhhbXBsZXMvKVxuICogZm9yIGRldGFpbHMgb3ZlciB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiBgXy5kZWJvdW5jZWAgYW5kIGBfLnRocm90dGxlYC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDAuMS4wXG4gKiBAY2F0ZWdvcnkgRnVuY3Rpb25cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxuICogQHBhcmFtIHtudW1iZXJ9IFt3YWl0PTBdIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zPXt9XSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdXG4gKiAgU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgbGVhZGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdXG4gKiAgVGhlIG1heGltdW0gdGltZSBgZnVuY2AgaXMgYWxsb3dlZCB0byBiZSBkZWxheWVkIGJlZm9yZSBpdCdzIGludm9rZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdXG4gKiAgU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gQXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eC5cbiAqIGpRdWVyeSh3aW5kb3cpLm9uKCdyZXNpemUnLCBfLmRlYm91bmNlKGNhbGN1bGF0ZUxheW91dCwgMTUwKSk7XG4gKlxuICogLy8gSW52b2tlIGBzZW5kTWFpbGAgd2hlbiBjbGlja2VkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHMuXG4gKiBqUXVlcnkoZWxlbWVudCkub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XG4gKiAgICdsZWFkaW5nJzogdHJ1ZSxcbiAqICAgJ3RyYWlsaW5nJzogZmFsc2VcbiAqIH0pKTtcbiAqXG4gKiAvLyBFbnN1cmUgYGJhdGNoTG9nYCBpcyBpbnZva2VkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzLlxuICogdmFyIGRlYm91bmNlZCA9IF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwgeyAnbWF4V2FpdCc6IDEwMDAgfSk7XG4gKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XG4gKiBqUXVlcnkoc291cmNlKS5vbignbWVzc2FnZScsIGRlYm91bmNlZCk7XG4gKlxuICogLy8gQ2FuY2VsIHRoZSB0cmFpbGluZyBkZWJvdW5jZWQgaW52b2NhdGlvbi5cbiAqIGpRdWVyeSh3aW5kb3cpLm9uKCdwb3BzdGF0ZScsIGRlYm91bmNlZC5jYW5jZWwpO1xuICovXG5mdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gIHZhciBsYXN0QXJncyxcbiAgICAgIGxhc3RUaGlzLFxuICAgICAgbWF4V2FpdCxcbiAgICAgIHJlc3VsdCxcbiAgICAgIHRpbWVySWQsXG4gICAgICBsYXN0Q2FsbFRpbWUsXG4gICAgICBsYXN0SW52b2tlVGltZSA9IDAsXG4gICAgICBsZWFkaW5nID0gZmFsc2UsXG4gICAgICBtYXhpbmcgPSBmYWxzZSxcbiAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcblxuICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgfVxuICB3YWl0ID0gdG9OdW1iZXIod2FpdCkgfHwgMDtcbiAgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgbGVhZGluZyA9ICEhb3B0aW9ucy5sZWFkaW5nO1xuICAgIG1heGluZyA9ICdtYXhXYWl0JyBpbiBvcHRpb25zO1xuICAgIG1heFdhaXQgPSBtYXhpbmcgPyBuYXRpdmVNYXgodG9OdW1iZXIob3B0aW9ucy5tYXhXYWl0KSB8fCAwLCB3YWl0KSA6IG1heFdhaXQ7XG4gICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyAhIW9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcbiAgfVxuXG4gIGZ1bmN0aW9uIGludm9rZUZ1bmModGltZSkge1xuICAgIHZhciBhcmdzID0gbGFzdEFyZ3MsXG4gICAgICAgIHRoaXNBcmcgPSBsYXN0VGhpcztcblxuICAgIGxhc3RBcmdzID0gbGFzdFRoaXMgPSB1bmRlZmluZWQ7XG4gICAgbGFzdEludm9rZVRpbWUgPSB0aW1lO1xuICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGxlYWRpbmdFZGdlKHRpbWUpIHtcbiAgICAvLyBSZXNldCBhbnkgYG1heFdhaXRgIHRpbWVyLlxuICAgIGxhc3RJbnZva2VUaW1lID0gdGltZTtcbiAgICAvLyBTdGFydCB0aGUgdGltZXIgZm9yIHRoZSB0cmFpbGluZyBlZGdlLlxuICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdCk7XG4gICAgLy8gSW52b2tlIHRoZSBsZWFkaW5nIGVkZ2UuXG4gICAgcmV0dXJuIGxlYWRpbmcgPyBpbnZva2VGdW5jKHRpbWUpIDogcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtYWluaW5nV2FpdCh0aW1lKSB7XG4gICAgdmFyIHRpbWVTaW5jZUxhc3RDYWxsID0gdGltZSAtIGxhc3RDYWxsVGltZSxcbiAgICAgICAgdGltZVNpbmNlTGFzdEludm9rZSA9IHRpbWUgLSBsYXN0SW52b2tlVGltZSxcbiAgICAgICAgcmVzdWx0ID0gd2FpdCAtIHRpbWVTaW5jZUxhc3RDYWxsO1xuXG4gICAgcmV0dXJuIG1heGluZyA/IG5hdGl2ZU1pbihyZXN1bHQsIG1heFdhaXQgLSB0aW1lU2luY2VMYXN0SW52b2tlKSA6IHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3VsZEludm9rZSh0aW1lKSB7XG4gICAgdmFyIHRpbWVTaW5jZUxhc3RDYWxsID0gdGltZSAtIGxhc3RDYWxsVGltZSxcbiAgICAgICAgdGltZVNpbmNlTGFzdEludm9rZSA9IHRpbWUgLSBsYXN0SW52b2tlVGltZTtcblxuICAgIC8vIEVpdGhlciB0aGlzIGlzIHRoZSBmaXJzdCBjYWxsLCBhY3Rpdml0eSBoYXMgc3RvcHBlZCBhbmQgd2UncmUgYXQgdGhlXG4gICAgLy8gdHJhaWxpbmcgZWRnZSwgdGhlIHN5c3RlbSB0aW1lIGhhcyBnb25lIGJhY2t3YXJkcyBhbmQgd2UncmUgdHJlYXRpbmdcbiAgICAvLyBpdCBhcyB0aGUgdHJhaWxpbmcgZWRnZSwgb3Igd2UndmUgaGl0IHRoZSBgbWF4V2FpdGAgbGltaXQuXG4gICAgcmV0dXJuIChsYXN0Q2FsbFRpbWUgPT09IHVuZGVmaW5lZCB8fCAodGltZVNpbmNlTGFzdENhbGwgPj0gd2FpdCkgfHxcbiAgICAgICh0aW1lU2luY2VMYXN0Q2FsbCA8IDApIHx8IChtYXhpbmcgJiYgdGltZVNpbmNlTGFzdEludm9rZSA+PSBtYXhXYWl0KSk7XG4gIH1cblxuICBmdW5jdGlvbiB0aW1lckV4cGlyZWQoKSB7XG4gICAgdmFyIHRpbWUgPSBub3coKTtcbiAgICBpZiAoc2hvdWxkSW52b2tlKHRpbWUpKSB7XG4gICAgICByZXR1cm4gdHJhaWxpbmdFZGdlKHRpbWUpO1xuICAgIH1cbiAgICAvLyBSZXN0YXJ0IHRoZSB0aW1lci5cbiAgICB0aW1lcklkID0gc2V0VGltZW91dCh0aW1lckV4cGlyZWQsIHJlbWFpbmluZ1dhaXQodGltZSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJhaWxpbmdFZGdlKHRpbWUpIHtcbiAgICB0aW1lcklkID0gdW5kZWZpbmVkO1xuXG4gICAgLy8gT25seSBpbnZva2UgaWYgd2UgaGF2ZSBgbGFzdEFyZ3NgIHdoaWNoIG1lYW5zIGBmdW5jYCBoYXMgYmVlblxuICAgIC8vIGRlYm91bmNlZCBhdCBsZWFzdCBvbmNlLlxuICAgIGlmICh0cmFpbGluZyAmJiBsYXN0QXJncykge1xuICAgICAgcmV0dXJuIGludm9rZUZ1bmModGltZSk7XG4gICAgfVxuICAgIGxhc3RBcmdzID0gbGFzdFRoaXMgPSB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbmNlbCgpIHtcbiAgICBpZiAodGltZXJJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXJJZCk7XG4gICAgfVxuICAgIGxhc3RJbnZva2VUaW1lID0gMDtcbiAgICBsYXN0QXJncyA9IGxhc3RDYWxsVGltZSA9IGxhc3RUaGlzID0gdGltZXJJZCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZsdXNoKCkge1xuICAgIHJldHVybiB0aW1lcklkID09PSB1bmRlZmluZWQgPyByZXN1bHQgOiB0cmFpbGluZ0VkZ2Uobm93KCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xuICAgIHZhciB0aW1lID0gbm93KCksXG4gICAgICAgIGlzSW52b2tpbmcgPSBzaG91bGRJbnZva2UodGltZSk7XG5cbiAgICBsYXN0QXJncyA9IGFyZ3VtZW50cztcbiAgICBsYXN0VGhpcyA9IHRoaXM7XG4gICAgbGFzdENhbGxUaW1lID0gdGltZTtcblxuICAgIGlmIChpc0ludm9raW5nKSB7XG4gICAgICBpZiAodGltZXJJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBsZWFkaW5nRWRnZShsYXN0Q2FsbFRpbWUpO1xuICAgICAgfVxuICAgICAgaWYgKG1heGluZykge1xuICAgICAgICAvLyBIYW5kbGUgaW52b2NhdGlvbnMgaW4gYSB0aWdodCBsb29wLlxuICAgICAgICB0aW1lcklkID0gc2V0VGltZW91dCh0aW1lckV4cGlyZWQsIHdhaXQpO1xuICAgICAgICByZXR1cm4gaW52b2tlRnVuYyhsYXN0Q2FsbFRpbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGltZXJJZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aW1lcklkID0gc2V0VGltZW91dCh0aW1lckV4cGlyZWQsIHdhaXQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGRlYm91bmNlZC5jYW5jZWwgPSBjYW5jZWw7XG4gIGRlYm91bmNlZC5mbHVzaCA9IGZsdXNoO1xuICByZXR1cm4gZGVib3VuY2VkO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZVxuICogW2xhbmd1YWdlIHR5cGVdKGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi83LjAvI3NlYy1lY21hc2NyaXB0LWxhbmd1YWdlLXR5cGVzKVxuICogb2YgYE9iamVjdGAuIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChfLm5vb3ApO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QobnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgcmV0dXJuICEhdmFsdWUgJiYgKHR5cGUgPT0gJ29iamVjdCcgfHwgdHlwZSA9PSAnZnVuY3Rpb24nKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZS4gQSB2YWx1ZSBpcyBvYmplY3QtbGlrZSBpZiBpdCdzIG5vdCBgbnVsbGBcbiAqIGFuZCBoYXMgYSBgdHlwZW9mYCByZXN1bHQgb2YgXCJvYmplY3RcIi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBvYmplY3QtbGlrZSwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZSh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdExpa2UoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShfLm5vb3ApO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShudWxsKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0TGlrZSh2YWx1ZSkge1xuICByZXR1cm4gISF2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCc7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgY2xhc3NpZmllZCBhcyBhIGBTeW1ib2xgIHByaW1pdGl2ZSBvciBvYmplY3QuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYSBzeW1ib2wsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc1N5bWJvbChTeW1ib2wuaXRlcmF0b3IpO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNTeW1ib2woJ2FiYycpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNTeW1ib2wodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnc3ltYm9sJyB8fFxuICAgIChpc09iamVjdExpa2UodmFsdWUpICYmIG9iamVjdFRvU3RyaW5nLmNhbGwodmFsdWUpID09IHN5bWJvbFRhZyk7XG59XG5cbi8qKlxuICogQ29udmVydHMgYHZhbHVlYCB0byBhIG51bWJlci5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gcHJvY2Vzcy5cbiAqIEByZXR1cm5zIHtudW1iZXJ9IFJldHVybnMgdGhlIG51bWJlci5cbiAqIEBleGFtcGxlXG4gKlxuICogXy50b051bWJlcigzLjIpO1xuICogLy8gPT4gMy4yXG4gKlxuICogXy50b051bWJlcihOdW1iZXIuTUlOX1ZBTFVFKTtcbiAqIC8vID0+IDVlLTMyNFxuICpcbiAqIF8udG9OdW1iZXIoSW5maW5pdHkpO1xuICogLy8gPT4gSW5maW5pdHlcbiAqXG4gKiBfLnRvTnVtYmVyKCczLjInKTtcbiAqIC8vID0+IDMuMlxuICovXG5mdW5jdGlvbiB0b051bWJlcih2YWx1ZSkge1xuICBpZiAodHlwZW9mIHZhbHVlID09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGlmIChpc1N5bWJvbCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gTkFOO1xuICB9XG4gIGlmIChpc09iamVjdCh2YWx1ZSkpIHtcbiAgICB2YXIgb3RoZXIgPSB0eXBlb2YgdmFsdWUudmFsdWVPZiA9PSAnZnVuY3Rpb24nID8gdmFsdWUudmFsdWVPZigpIDogdmFsdWU7XG4gICAgdmFsdWUgPSBpc09iamVjdChvdGhlcikgPyAob3RoZXIgKyAnJykgOiBvdGhlcjtcbiAgfVxuICBpZiAodHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSAwID8gdmFsdWUgOiArdmFsdWU7XG4gIH1cbiAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKHJlVHJpbSwgJycpO1xuICB2YXIgaXNCaW5hcnkgPSByZUlzQmluYXJ5LnRlc3QodmFsdWUpO1xuICByZXR1cm4gKGlzQmluYXJ5IHx8IHJlSXNPY3RhbC50ZXN0KHZhbHVlKSlcbiAgICA/IGZyZWVQYXJzZUludCh2YWx1ZS5zbGljZSgyKSwgaXNCaW5hcnkgPyAyIDogOClcbiAgICA6IChyZUlzQmFkSGV4LnRlc3QodmFsdWUpID8gTkFOIDogK3ZhbHVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTtcbiIsInZhciBtdXJtdXIzID0gcmVxdWlyZShcIi4vbXVybXVyaGFzaDNfZ2MuanNcIilcbnZhciBtdXJtdXIyID0gcmVxdWlyZShcIi4vbXVybXVyaGFzaDJfZ2MuanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBtdXJtdXIzXG5tb2R1bGUuZXhwb3J0cy5tdXJtdXIzID0gbXVybXVyM1xubW9kdWxlLmV4cG9ydHMubXVybXVyMiA9IG11cm11cjJcbiIsIi8qKlxuICogSlMgSW1wbGVtZW50YXRpb24gb2YgTXVybXVySGFzaDJcbiAqIFxuICogQGF1dGhvciA8YSBocmVmPVwibWFpbHRvOmdhcnkuY291cnRAZ21haWwuY29tXCI+R2FyeSBDb3VydDwvYT5cbiAqIEBzZWUgaHR0cDovL2dpdGh1Yi5jb20vZ2FyeWNvdXJ0L211cm11cmhhc2gtanNcbiAqIEBhdXRob3IgPGEgaHJlZj1cIm1haWx0bzphYXBwbGVieUBnbWFpbC5jb21cIj5BdXN0aW4gQXBwbGVieTwvYT5cbiAqIEBzZWUgaHR0cDovL3NpdGVzLmdvb2dsZS5jb20vc2l0ZS9tdXJtdXJoYXNoL1xuICogXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIEFTQ0lJIG9ubHlcbiAqIEBwYXJhbSB7bnVtYmVyfSBzZWVkIFBvc2l0aXZlIGludGVnZXIgb25seVxuICogQHJldHVybiB7bnVtYmVyfSAzMi1iaXQgcG9zaXRpdmUgaW50ZWdlciBoYXNoXG4gKi9cblxuZnVuY3Rpb24gbXVybXVyaGFzaDJfMzJfZ2Moc3RyLCBzZWVkKSB7XG4gIHZhclxuICAgIGwgPSBzdHIubGVuZ3RoLFxuICAgIGggPSBzZWVkIF4gbCxcbiAgICBpID0gMCxcbiAgICBrO1xuICBcbiAgd2hpbGUgKGwgPj0gNCkge1xuICBcdGsgPSBcbiAgXHQgICgoc3RyLmNoYXJDb2RlQXQoaSkgJiAweGZmKSkgfFxuICBcdCAgKChzdHIuY2hhckNvZGVBdCgrK2kpICYgMHhmZikgPDwgOCkgfFxuICBcdCAgKChzdHIuY2hhckNvZGVBdCgrK2kpICYgMHhmZikgPDwgMTYpIHxcbiAgXHQgICgoc3RyLmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDI0KTtcbiAgICBcbiAgICBrID0gKCgoayAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChrID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKTtcbiAgICBrIF49IGsgPj4+IDI0O1xuICAgIGsgPSAoKChrICYgMHhmZmZmKSAqIDB4NWJkMWU5OTUpICsgKCgoKGsgPj4+IDE2KSAqIDB4NWJkMWU5OTUpICYgMHhmZmZmKSA8PCAxNikpO1xuXG5cdGggPSAoKChoICYgMHhmZmZmKSAqIDB4NWJkMWU5OTUpICsgKCgoKGggPj4+IDE2KSAqIDB4NWJkMWU5OTUpICYgMHhmZmZmKSA8PCAxNikpIF4gaztcblxuICAgIGwgLT0gNDtcbiAgICArK2k7XG4gIH1cbiAgXG4gIHN3aXRjaCAobCkge1xuICBjYXNlIDM6IGggXj0gKHN0ci5jaGFyQ29kZUF0KGkgKyAyKSAmIDB4ZmYpIDw8IDE2O1xuICBjYXNlIDI6IGggXj0gKHN0ci5jaGFyQ29kZUF0KGkgKyAxKSAmIDB4ZmYpIDw8IDg7XG4gIGNhc2UgMTogaCBePSAoc3RyLmNoYXJDb2RlQXQoaSkgJiAweGZmKTtcbiAgICAgICAgICBoID0gKCgoaCAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChoID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKTtcbiAgfVxuXG4gIGggXj0gaCA+Pj4gMTM7XG4gIGggPSAoKChoICYgMHhmZmZmKSAqIDB4NWJkMWU5OTUpICsgKCgoKGggPj4+IDE2KSAqIDB4NWJkMWU5OTUpICYgMHhmZmZmKSA8PCAxNikpO1xuICBoIF49IGggPj4+IDE1O1xuXG4gIHJldHVybiBoID4+PiAwO1xufVxuXG5pZih0eXBlb2YgbW9kdWxlICE9PSB1bmRlZmluZWQpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBtdXJtdXJoYXNoMl8zMl9nY1xufVxuIiwiLyoqXG4gKiBKUyBJbXBsZW1lbnRhdGlvbiBvZiBNdXJtdXJIYXNoMyAocjEzNikgKGFzIG9mIE1heSAyMCwgMjAxMSlcbiAqIFxuICogQGF1dGhvciA8YSBocmVmPVwibWFpbHRvOmdhcnkuY291cnRAZ21haWwuY29tXCI+R2FyeSBDb3VydDwvYT5cbiAqIEBzZWUgaHR0cDovL2dpdGh1Yi5jb20vZ2FyeWNvdXJ0L211cm11cmhhc2gtanNcbiAqIEBhdXRob3IgPGEgaHJlZj1cIm1haWx0bzphYXBwbGVieUBnbWFpbC5jb21cIj5BdXN0aW4gQXBwbGVieTwvYT5cbiAqIEBzZWUgaHR0cDovL3NpdGVzLmdvb2dsZS5jb20vc2l0ZS9tdXJtdXJoYXNoL1xuICogXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IEFTQ0lJIG9ubHlcbiAqIEBwYXJhbSB7bnVtYmVyfSBzZWVkIFBvc2l0aXZlIGludGVnZXIgb25seVxuICogQHJldHVybiB7bnVtYmVyfSAzMi1iaXQgcG9zaXRpdmUgaW50ZWdlciBoYXNoIFxuICovXG5cbmZ1bmN0aW9uIG11cm11cmhhc2gzXzMyX2djKGtleSwgc2VlZCkge1xuXHR2YXIgcmVtYWluZGVyLCBieXRlcywgaDEsIGgxYiwgYzEsIGMxYiwgYzIsIGMyYiwgazEsIGk7XG5cdFxuXHRyZW1haW5kZXIgPSBrZXkubGVuZ3RoICYgMzsgLy8ga2V5Lmxlbmd0aCAlIDRcblx0Ynl0ZXMgPSBrZXkubGVuZ3RoIC0gcmVtYWluZGVyO1xuXHRoMSA9IHNlZWQ7XG5cdGMxID0gMHhjYzllMmQ1MTtcblx0YzIgPSAweDFiODczNTkzO1xuXHRpID0gMDtcblx0XG5cdHdoaWxlIChpIDwgYnl0ZXMpIHtcblx0ICBcdGsxID0gXG5cdCAgXHQgICgoa2V5LmNoYXJDb2RlQXQoaSkgJiAweGZmKSkgfFxuXHQgIFx0ICAoKGtleS5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCA4KSB8XG5cdCAgXHQgICgoa2V5LmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDE2KSB8XG5cdCAgXHQgICgoa2V5LmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDI0KTtcblx0XHQrK2k7XG5cdFx0XG5cdFx0azEgPSAoKCgoazEgJiAweGZmZmYpICogYzEpICsgKCgoKGsxID4+PiAxNikgKiBjMSkgJiAweGZmZmYpIDw8IDE2KSkpICYgMHhmZmZmZmZmZjtcblx0XHRrMSA9IChrMSA8PCAxNSkgfCAoazEgPj4+IDE3KTtcblx0XHRrMSA9ICgoKChrMSAmIDB4ZmZmZikgKiBjMikgKyAoKCgoazEgPj4+IDE2KSAqIGMyKSAmIDB4ZmZmZikgPDwgMTYpKSkgJiAweGZmZmZmZmZmO1xuXG5cdFx0aDEgXj0gazE7XG4gICAgICAgIGgxID0gKGgxIDw8IDEzKSB8IChoMSA+Pj4gMTkpO1xuXHRcdGgxYiA9ICgoKChoMSAmIDB4ZmZmZikgKiA1KSArICgoKChoMSA+Pj4gMTYpICogNSkgJiAweGZmZmYpIDw8IDE2KSkpICYgMHhmZmZmZmZmZjtcblx0XHRoMSA9ICgoKGgxYiAmIDB4ZmZmZikgKyAweDZiNjQpICsgKCgoKGgxYiA+Pj4gMTYpICsgMHhlNjU0KSAmIDB4ZmZmZikgPDwgMTYpKTtcblx0fVxuXHRcblx0azEgPSAwO1xuXHRcblx0c3dpdGNoIChyZW1haW5kZXIpIHtcblx0XHRjYXNlIDM6IGsxIF49IChrZXkuY2hhckNvZGVBdChpICsgMikgJiAweGZmKSA8PCAxNjtcblx0XHRjYXNlIDI6IGsxIF49IChrZXkuY2hhckNvZGVBdChpICsgMSkgJiAweGZmKSA8PCA4O1xuXHRcdGNhc2UgMTogazEgXj0gKGtleS5jaGFyQ29kZUF0KGkpICYgMHhmZik7XG5cdFx0XG5cdFx0azEgPSAoKChrMSAmIDB4ZmZmZikgKiBjMSkgKyAoKCgoazEgPj4+IDE2KSAqIGMxKSAmIDB4ZmZmZikgPDwgMTYpKSAmIDB4ZmZmZmZmZmY7XG5cdFx0azEgPSAoazEgPDwgMTUpIHwgKGsxID4+PiAxNyk7XG5cdFx0azEgPSAoKChrMSAmIDB4ZmZmZikgKiBjMikgKyAoKCgoazEgPj4+IDE2KSAqIGMyKSAmIDB4ZmZmZikgPDwgMTYpKSAmIDB4ZmZmZmZmZmY7XG5cdFx0aDEgXj0gazE7XG5cdH1cblx0XG5cdGgxIF49IGtleS5sZW5ndGg7XG5cblx0aDEgXj0gaDEgPj4+IDE2O1xuXHRoMSA9ICgoKGgxICYgMHhmZmZmKSAqIDB4ODVlYmNhNmIpICsgKCgoKGgxID4+PiAxNikgKiAweDg1ZWJjYTZiKSAmIDB4ZmZmZikgPDwgMTYpKSAmIDB4ZmZmZmZmZmY7XG5cdGgxIF49IGgxID4+PiAxMztcblx0aDEgPSAoKCgoaDEgJiAweGZmZmYpICogMHhjMmIyYWUzNSkgKyAoKCgoaDEgPj4+IDE2KSAqIDB4YzJiMmFlMzUpICYgMHhmZmZmKSA8PCAxNikpKSAmIDB4ZmZmZmZmZmY7XG5cdGgxIF49IGgxID4+PiAxNjtcblxuXHRyZXR1cm4gaDEgPj4+IDA7XG59XG5cbmlmKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBtdXJtdXJoYXNoM18zMl9nY1xufSIsIi8qKlxyXG4gKiBUcmFuc2Zvcm0gdGhlIGZpbHRlciBpbnB1dCBpbnRvIGEgUmVnRXhwLCB0byBsZXQgdGhlIHVzZXIgaGF2ZSBhIHBvd2VyZnVsbCB3YXkgdG8gZmlsdGVyIGluIHRoZSB0YWJsZS5cclxuICogT25seSByb3dzIHdoZXJlIHRoZSB0ZXN0ZWQgdmFsdWUgbWF0Y2hlcyB0aGUgUmVnRXhwLCBnZXQgZGlzcGxheWVkLiBcclxuICogQWRkaXRpb25hbGx5IHlvdSBjYW4gcHJlcGVuZCB0aHJlZSBleGNsYW1hdGlvbiBtYXJrcyAoJyEhIScpIHRvIG5lZ2F0ZSB0aGUgUmVnRXhwLCBzbyB0aGF0IG9ubHkgcm93cyB0aGF0XHJcbiAqIGRvbid0IG1hdGNoIHRoZSBSZWdFeHAgYXJlIGRpc3BsYXllZC4gVGhpcyBpcyB0aGUgZGVmYXVsdCBmaWx0ZXIgZnVuY3Rpb24uXHJcbiAqIFRoaXMgZnVuY3Rpb24gY2FuIGJlIHJlcGxhY2VkIGJ5IHN1cHBseWluZyB5b3VyIG93biBmdW5jdGlvbnMgdG8gVGFibGVDb21wb25lbnQuZmlsdGVyT3BlcmF0aW9ucy5cclxuICogXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWx0ZXJJbnB1dCB0aGUgdmFsdWUgb2YgdGhlIGZpbHRlciB0ZXh0IGlucHV0IGZpZWxkLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gdGVzdFZhbHVlIHRoZSB0YWJsZSB2YWx1ZSB0byB2YWxpZGF0ZSBhZ2FpbnN0LlxyXG4gKi9cclxuZnVuY3Rpb24gcmVnZXhGaWx0ZXIobmVnYXRlLCBmaWx0ZXJJbnB1dCwgdGVzdFZhbHVlKXtcclxuICAvLyBsZXQgbmVnYXRlID0gZmlsdGVySW5wdXQuc3Vic3RyaW5nKDAsIDMpID09PSAnISEhJztcclxuICAvLyBmaWx0ZXJJbnB1dCA9IG5lZ2F0ZSA/IGZpbHRlcklucHV0LnN1YnN0cmluZygzKSA6IGZpbHRlcklucHV0O1xyXG4gIGxldCByZXN1bHQgPSBmYWxzZTtcclxuICBpZih0ZXN0VmFsdWUgIT0gdW5kZWZpbmVkKXtcclxuICAgIGxldCBtYXRjaGVzID0gdGVzdFZhbHVlLnRvU3RyaW5nKCkubWF0Y2gobmV3IFJlZ0V4cChmaWx0ZXJJbnB1dCwgJ2knKSk7XHJcbiAgICByZXN1bHQgPSBCb29sZWFuKG1hdGNoZXMpICYmIG1hdGNoZXMubGVuZ3RoID4gMDtcclxuICB9XHJcbiAgcmV0dXJuIG5lZ2F0ZSA/ICFyZXN1bHQgOiByZXN1bHQ7XHJcbn1cclxuICBcclxuLyoqXHJcbiAqIFRlc3QgdGhlIGZpbHRlciBpbnB1dCBzdHJpbmcgd2l0aCBpbmNsdWRlcyAoY2FzZSBpcyBpZ25vcmVkKSBhZ2FpbnN0IHRoZSB0YWJsZSB2YWx1ZS5cclxuICogT25seSByb3dzIHdoZXJlIHRoZSBmaWx0ZXIgaW5wdXQgaXMgYSBzdWJzdHJpbmcgb2YgdGhlIHRlc3RlZCB2YWx1ZS5cclxuICogQWRkaXRpb25hbGx5IHlvdSBjYW4gcHJlcGVuZCB0aHJlZSBleGNsYW1hdGlvbiBtYXJrcyAoJyEhIScpIHRvIG5lZ2F0ZSB0aGUgb3V0Y29tZSwgXHJcbiAqIHNvIHRoYXQgb25seSByb3dzIHRoYXQgYXJlIG5vdCBpbmNsdWRlZCBpbiB0aGUgdGFibGUgdmFsdWUgYXJlIGRpc3BsYXllZC5cclxuICogVGhpcyBmdW5jdGlvbiBjYW4gcmVwbGFjZSByZWdleEZpbHRlciBieSBzdXBwbHlpbmcgaXQgdG8gVGFibGVDb21wb25lbnQuZmlsdGVyT3BlcmF0aW9ucyBvciBvdmVyd3JpdGluZ1xyXG4gKiByZWdleEZpbHRlciBiZWZvcmUgdXNlLlxyXG4gKiBcclxuICogQHBhcmFtIHtzdHJpbmd9IGZpbHRlcklucHV0IHRoZSB2YWx1ZSBvZiB0aGUgZmlsdGVyIHRleHQgaW5wdXQgZmllbGQuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXN0VmFsdWUgdGhlIHRhYmxlIHZhbHVlIHRvIHZhbGlkYXRlIGFnYWluc3QuXHJcbiAqL1xyXG5mdW5jdGlvbiB0ZXh0RmlsdGVyKG5lZ2F0ZSwgZmlsdGVySW5wdXQsIHRlc3RWYWx1ZSl7XHJcbiAgLy8gbGV0IG5lZ2F0ZSA9IGZpbHRlcklucHV0LnN1YnN0cmluZygwLCAzKSA9PT0gJyEhISc7XHJcbiAgLy8gZmlsdGVySW5wdXQgPSBuZWdhdGUgPyBmaWx0ZXJJbnB1dC5zdWJzdHJpbmcoMykgOiBmaWx0ZXJJbnB1dDtcclxuICBsZXQgcmVzdWx0ID0gZmFsc2U7XHJcbiAgaWYodGVzdFZhbHVlICE9IHVuZGVmaW5lZCl7XHJcbiAgICByZXN1bHQgPSB0ZXN0VmFsdWUudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpLmluY2x1ZGVzKGZpbHRlcklucHV0LnRvVXBwZXJDYXNlKCkpO1xyXG4gIH1cclxuICByZXR1cm4gbmVnYXRlID8gIXJlc3VsdCA6IHJlc3VsdDtcclxufVxyXG5cclxuZnVuY3Rpb24gY29tcGFyZUZpbHRlcihvcGVyYXRpb24sIGZpbHRlcklucHV0LCB0ZXN0VmFsdWUpe1xyXG4gIGxldCByZXN1bHQgPSBmYWxzZTtcclxuICBpZih0ZXN0VmFsdWUgIT0gdW5kZWZpbmVkKXtcclxuICAgIHRyeXtcclxuICAgICAgcmVzdWx0ID0gb3BlcmF0aW9uKE51bWJlci5wYXJzZUZsb2F0KGZpbHRlcklucHV0KSwgTnVtYmVyLnBhcnNlRmxvYXQodGVzdFZhbHVlKSk7XHJcbiAgICB9IGNhdGNoIChlcnIpe1xyXG4gICAgICByZXN1bHQgPSBvcGVyYXRpb24oZmlsdGVySW5wdXQudG9TdHJpbmcoKSwgdGVzdFZhbHVlLnRvU3RyaW5nKCkpO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtyZWdleEZpbHRlciwgdGV4dEZpbHRlciwgY29tcGFyZUZpbHRlcn07IiwiZnVuY3Rpb24gZ2V0RnJhbWVTdGFydEVuZChjdXJyZW50UGFnZSwgdG90YWxQYWdlcykge1xyXG4gICAgbGV0IHN0YXJ0ID0gY3VycmVudFBhZ2UgLSAyO1xyXG4gICAgbGV0IGVuZCA9IGN1cnJlbnRQYWdlICsgMjtcclxuXHJcbiAgICBpZiAoY3VycmVudFBhZ2UgPj0gdG90YWxQYWdlcyAtIDEpIHtcclxuICAgICAgICBlbmQgPSB0b3RhbFBhZ2VzO1xyXG4gICAgICAgIHN0YXJ0ID0gdG90YWxQYWdlcyA8IDUgPyAxIDogdG90YWxQYWdlcyAtIDQ7XHJcbiAgICB9IGVsc2UgaWYgKGN1cnJlbnRQYWdlIDw9IDIpIHtcclxuICAgICAgICBlbmQgPSB0b3RhbFBhZ2VzIDwgNSA/IHRvdGFsUGFnZXMgOiA1O1xyXG4gICAgICAgIHN0YXJ0ID0gMTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyBzdGFydDogc3RhcnQsIGVuZDogZW5kIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNoYW5nZVBhZ2VUbyh0YWJsZSwgdGFyZ2V0UGFnZSkge1xyXG4gICAgdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSA9IHRhcmdldFBhZ2U7XHJcbiAgICB0YWJsZS5zZXJpYWxpemVMaW5rT3B0aW9ucygpO1xyXG4gICAgdGFibGUucmVkcmF3RGF0YSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvblBhZ2VDaGFuZ2VLZXkodGFibGUsIGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PSAzNykge1xyXG4gICAgICAgIGNoYW5nZVBhZ2VUbyh0YWJsZSwgdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSA+IDEgPyB0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlIC0gMSA6IDEpXHJcbiAgICAgICAgICAgIC8vdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSA9IHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPiAxID8gdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSAtIDEgOiAxO1xyXG4gICAgICAgICAgICAvL3RhYmxlLnJlZHJhd0RhdGEoKTtcclxuICAgIH0gZWxzZSBpZiAoZXZlbnQua2V5Q29kZSA9PSAzOSkge1xyXG4gICAgICAgIGNoYW5nZVBhZ2VUbyh0YWJsZSwgdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSA8IHRhYmxlLnBhZ2luYXRpb24udG90YWxQYWdlcyA/IHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgKyAxIDogdGFibGUucGFnaW5hdGlvbi50b3RhbFBhZ2VzKTtcclxuICAgICAgICAvL3RhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPSB0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlIDwgdGFibGUucGFnaW5hdGlvbi50b3RhbFBhZ2VzID8gdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSArIDEgOiB0YWJsZS5wYWdpbmF0aW9uLnRvdGFsUGFnZXM7XHJcbiAgICAgICAgLy90YWJsZS5yZWRyYXdEYXRhKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsaWNrSGFuZGxlckRvY3VtZW50KHRhYmxlLCBldmVudCkge1xyXG4gICAgbGV0IGtleUNoYW5nZUxpc3RlbmVyID0gb25QYWdlQ2hhbmdlS2V5LmJpbmQobnVsbCwgdGFibGUpO1xyXG5cclxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywga2V5Q2hhbmdlTGlzdGVuZXIpO1xyXG5cclxuICAgIGlmICh0YWJsZS5lbGVtZW50cy5wYWdlQ2hvb3NlciA9PSBldmVudC50YXJnZXQgfHwgdGFibGUuZWxlbWVudHMucGFnZUNob29zZXIgPT0gZXZlbnQudGFyZ2V0LnBhcmVudE5vZGUpIHtcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGtleUNoYW5nZUxpc3RlbmVyKTtcclxuICAgICAgICB0YWJsZS5lbGVtZW50cy5wYWdlQ2hvb3Nlci5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAodGFibGUgJiYgdGFibGUuZWxlbWVudHMucGFnZUNob29zZXIpIHRhYmxlLmVsZW1lbnRzLnBhZ2VDaG9vc2VyLmNsYXNzTGlzdC5yZW1vdmUoJ3NlbGVjdGVkJyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmxldCBjbGlja0hhbmRsZXJCb3VuZENhbGwgPSB1bmRlZmluZWQ7XHJcblxyXG5mdW5jdGlvbiBhZGRLZXlIYW5kbGVyVG9Eb2N1bWVudCh0YWJsZSkge1xyXG4gICAgaWYgKCFjbGlja0hhbmRsZXJCb3VuZENhbGwpIGNsaWNrSGFuZGxlckJvdW5kQ2FsbCA9IGNsaWNrSGFuZGxlckRvY3VtZW50LmJpbmQobnVsbCwgdGFibGUpO1xyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbGlja0hhbmRsZXJCb3VuZENhbGwpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbGlja0hhbmRsZXJCb3VuZENhbGwpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVQYWdlQ2hvb3Nlcih0YWJsZSwgZGF0YSkge1xyXG4gICAgbGV0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIGxldCBjdXJyZW50UGFnZSA9IHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2U7XHJcbiAgICBsZXQgdG90YWxQYWdlcyA9IHRhYmxlLnBhZ2luYXRpb24udG90YWxQYWdlcztcclxuICAgIGlmICh0YWJsZS5wYWdpbmF0aW9uLmFjdGl2ZSkge1xyXG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgncGFnZS1jaG9vc2VyJywgJ3dndC1wYWdpbmF0aW9uJyk7XHJcbiAgICAgICAgbGV0IGZyb250X2Rpc2FibGVkID0gY3VycmVudFBhZ2UgPT0gMVxyXG4gICAgICAgIGxldCBiYWNrX2Rpc2FibGVkID0gY3VycmVudFBhZ2UgPT0gdG90YWxQYWdlcztcclxuICAgICAgICBlbGVtZW50LmFwcGVuZChjcmVhdGVQYWdlQ2hvb3NlckNoaWxkKCc8PCcsIHRhYmxlLCAxLCBmYWxzZSwgZnJvbnRfZGlzYWJsZWQpKTtcclxuICAgICAgICBlbGVtZW50LmFwcGVuZChjcmVhdGVQYWdlQ2hvb3NlckNoaWxkKCc8JywgdGFibGUsIGN1cnJlbnRQYWdlIC0gMSwgZmFsc2UsIGZyb250X2Rpc2FibGVkKSk7XHJcbiAgICAgICAgbGV0IHsgc3RhcnQsIGVuZCB9ID0gZ2V0RnJhbWVTdGFydEVuZChjdXJyZW50UGFnZSwgdG90YWxQYWdlcyk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZSA9PSBpKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZChjcmVhdGVQYWdlQ2hvb3NlckNoaWxkKGkudG9TdHJpbmcoKSwgdGFibGUsIGksIHRydWUpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZVBhZ2VDaG9vc2VyQ2hpbGQoaS50b1N0cmluZygpLCB0YWJsZSwgaSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZVBhZ2VDaG9vc2VyQ2hpbGQoJz4nLCB0YWJsZSwgY3VycmVudFBhZ2UgKyAxLCBmYWxzZSwgYmFja19kaXNhYmxlZCkpO1xyXG4gICAgICAgIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZVBhZ2VDaG9vc2VyQ2hpbGQoJz4+JywgdGFibGUsIHRvdGFsUGFnZXMsIGZhbHNlLCBiYWNrX2Rpc2FibGVkKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZWxlbWVudDtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlUGFnZUNob29zZXJDaGlsZChjb250ZW50LCB0YWJsZSwgdGFyZ2V0UGFnZSwgaXNDdXJyZW50LCBpc0Rpc2FibGVkKSB7XHJcbiAgICBsZXQgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgZWxlbWVudC5pbm5lckhUTUwgPSBjb250ZW50O1xyXG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdwYWdlLWNoYW5nZScsICd3Z3QtcGFnaW5hdGlvbicpO1xyXG4gICAgaWYgKGlzQ3VycmVudCkge1xyXG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnYWN0aXZlLXBhZ2UnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKGlzRGlzYWJsZWQpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdwYWdlLWNoYW5nZS1kaXNhYmxlZCcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGNoYW5nZVBhZ2VUbyh0YWJsZSwgdGFyZ2V0UGFnZSlcclxuICAgICAgICAgICAgICAgICAgICAvL3RhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPSB0YXJnZXRQYWdlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vdGFibGUucmVkcmF3RGF0YSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZWxlbWVudDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBnZXRGcmFtZVN0YXJ0RW5kLFxyXG4gICAgY3JlYXRlUGFnZUNob29zZXIsXHJcbiAgICBjcmVhdGVQYWdlQ2hvb3NlckNoaWxkLFxyXG4gICAgYWRkS2V5SGFuZGxlclRvRG9jdW1lbnQsXHJcbiAgICBjaGFuZ2VQYWdlVG8sXHJcbn0iLCJ2YXIgY3NzID0gXCIvKiBib2R5IHtcXHJcXG4gIGZvbnQ6IGFyaWFsLCBzYW5zLXNlcmlmO1xcclxcbn0gKi9cXG4ud2d0LWdyaWQtY29udGFpbmVyIHtcXG4gIGRpc3BsYXk6IGdyaWQ7XFxuICBwb3NpdGlvbjogc3RhdGljO1xcbiAgbWF4LXdpZHRoOiBtaW4tY29udGVudDtcXG4gIG1heC1oZWlnaHQ6IDUwMHB4O1xcbiAgb3ZlcmZsb3cteTogc2Nyb2xsO1xcbiAgYmFja2dyb3VuZDogbGlnaHRncmF5O1xcbiAgLyogZ3JpZC1nYXA6IDFweDsgKi9cXG4gIC8qIGdyaWQtcm93LWdhcDogMnB4OyAqL1xcbiAgZ3JpZC1jb2x1bW4tZ2FwOiAycHg7XFxuICBib3JkZXI6IDFweCBzb2xpZCBsaWdodGdyYXk7XFxufVxcbi5oZWFkZXItY29sLXRvb2x0aXAge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxuICBib3JkZXI6IDFweCBzb2xpZCBsaWdodGdyYXk7XFxuICBib3JkZXItcmlnaHQ6IDFweCBkb3R0ZWQgbGlnaHRncmF5O1xcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxuICB6LWluZGV4OiA5OTtcXG4gIHZpc2liaWxpdHk6IGhpZGRlbjtcXG4gIG1hcmdpbjogLTFweDtcXG59XFxuLmhlYWRlci1jb2wtdG9vbHRpcC52aXNpYmxlIHtcXG4gIHZpc2liaWxpdHk6IHZpc2libGU7XFxufVxcbi53Z3QtaGVhZGVyIHtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgcG9zaXRpb246IHN0aWNreTtcXG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICB0b3A6IDBweDtcXG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCBsaWdodGdyYXk7XFxuICBvdmVyZmxvdy15OiBoaWRkZW47XFxufVxcbi53Z3QtaGVhZGVyPmRpdi5hcnJvdyB7XFxuICAvKiB2aXNpYmlsaXR5OiBoaWRkZW47ICovXFxuICBjb2xvcjogbGlnaHRncmF5O1xcbiAgd2lkdGg6IDFlbTtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgdG9wOiAwcHg7XFxuICBib3R0b206IDBweDtcXG4gIHJpZ2h0OiAwcHg7XFxuICBwYWRkaW5nLXJpZ2h0OiA1cHg7XFxuICBtYXJnaW4tdG9wOiBhdXRvO1xcbiAgbWFyZ2luLWJvdHRvbTogYXV0bztcXG4gIGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7XFxuICBmb250LXNpemU6IGxhcmdlO1xcbiAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG4gIHBhZGRpbmctdG9wOiA1cHg7XFxuICBwYWRkaW5nLWJvdHRvbTogNXB4O1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgLW1vei11c2VyLXNlbGVjdDogdGV4dDtcXG4gIGJhY2tncm91bmQ6IHdoaXRlO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgdHJhbnNmb3JtOiBzY2FsZSgxLCAyKXRyYW5zbGF0ZSgyMCUsIDEzJSk7XFxufVxcbi53Z3QtY29sLWhlYWRlci1jb250YWluZXIge1xcbiAgd2lkdGg6IDFlbTtcXG4gIG92ZXJmbG93LXg6IHZpc2libGU7XFxufVxcbi53Z3QtZmlsdGVyX2NlbGwge1xcbiAgcG9zaXRpb246IHN0aWNreTtcXG4gIHRvcDogMHB4O1xcbiAgYmFja2dyb3VuZDogd2hpdGU7XFxuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IDJlbTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICBmb250LXNpemU6IDFyZW07XFxuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgbGlnaHRncmF5O1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMXB4IDFweCA1cHggMHB4IGxpZ2h0Z3JleTtcXG4gIHBhZGRpbmctdG9wOiA1cHg7XFxuICBwYWRkaW5nLWJvdHRvbTogNXB4O1xcbiAgbWFyZ2luLXRvcDogYXV0bztcXG4gIG1hcmdpbi1ib3R0b206IGF1dG87XFxufVxcbi5maWx0ZXJfaW5wdXQge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiAwcHg7XFxuICBsZWZ0OiAwcHg7XFxuICBib3R0b206IDBweDtcXG4gIHJpZ2h0OiAwcHg7XFxuICBtYXJnaW4tdG9wOiBhdXRvO1xcbiAgbWFyZ2luLWJvdHRvbTogYXV0bztcXG4gIHBhZGRpbmctdG9wOiA1cHg7XFxuICBwYWRkaW5nLWJvdHRvbTogNXB4O1xcbn1cXG4uZmlsdGVyX25lZ2F0b3Ige1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxuICB0b3A6IDBweDtcXG4gIGJvdHRvbTogMHB4O1xcbiAgbGVmdDogMHB4O1xcbiAgcGFkZGluZy1sZWZ0OiA1cHg7XFxuICBtYXJnaW4tdG9wOiBhdXRvO1xcbiAgbWFyZ2luLWJvdHRvbTogYXV0bztcXG4gIGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7XFxuICBmb250LXNpemU6IDFlbTtcXG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICBwYWRkaW5nLXRvcDogNXB4O1xcbiAgcGFkZGluZy1ib3R0b206IDVweDtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG59XFxuLndndC1jZWxsIHtcXG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICBmb250LXNpemU6IDFyZW07XFxuICBwYWRkaW5nLWxlZnQ6IDIwcHg7XFxuICBwYWRkaW5nLXJpZ2h0OiAyMHB4O1xcbiAgcGFkZGluZy10b3A6IDEwcHg7XFxuICBwYWRkaW5nLWJvdHRvbTogMTBweDtcXG4gIGJhY2tncm91bmQ6IHdoaXRlO1xcbiAgLyogYm9yZGVyOiAycHggc29saWQgbGlnaHRncmF5OyAqL1xcbiAgb3ZlcmZsb3cteDogaGlkZGVuO1xcbn1cXG4ud2d0LWRhdGEtY2VsbCB7XFxuICBtYXgtd2lkdGg6IDUwMHB4O1xcbn1cXG4ud2d0LWhlYWRlci53Z3QtY2VsbCB7XFxuICBwYWRkaW5nLXJpZ2h0OiAzMHB4O1xcbn1cXG4ud2d0LXplYnJhXzEge1xcbiAgYmFja2dyb3VuZDogd2hpdGU7XFxufVxcbi53Z3QtemVicmFfMCB7XFxuICBiYWNrZ3JvdW5kOiByZ2IoMjMwLCAyMzAsIDIzMCk7XFxufVxcbi53Z3QtZm9vdGVyIHtcXG4gIGRpc3BsYXk6IGdyaWQ7XFxuICBwb3NpdGlvbjogc3RpY2t5O1xcbiAgYm90dG9tOiAwcHg7XFxuICBiYWNrZ3JvdW5kOiB3aGl0ZTtcXG4gIGJvcmRlci10b3A6IDFweCBzb2xpZCBsaWdodGdyYXk7XFxuICBncmlkLXRlbXBsYXRlLXJvd3M6IDFmcjtcXG4gIGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KDQsIGZpdC1jb250ZW50KDMwMHB4KSkgMWZyO1xcbn1cXG4uZm9vdGVyLWJ1dHRvbiB7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDI3LCAzMSwgMzUsIC4yKTtcXG4gIC8qIGJvcmRlci1yYWRpdXM6IC4yNWVtOyAqL1xcbiAgd2lkdGg6IG1heC1jb250ZW50O1xcbiAgb3ZlcmZsb3c6IHZpc2libGU7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjZWZmM2Y2O1xcbiAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KC0xODBkZWcsICNmYWZiZmMsIGVmZjNmNiwgOTAlKTtcXG4gIGJhY2tncm91bmQtcmVwZWF0OiByZXBlYXQteDtcXG4gIGJhY2tncm91bmQtcG9zaXRpb246IC0xcHggLTFweDtcXG4gIGJhY2tncm91bmQtc2l6ZTogMTEwJSAxMTAlO1xcbiAgLXdlYmtpdC1hcHBlYXJhbmNlOiBub25lO1xcbiAgLW1vei1hcHBlYXJhbmNlOiBub25lO1xcbiAgYXBwZWFyYW5jZTogbm9uZTtcXG4gIHVzZXItc2VsZWN0OiBub25lO1xcbn1cXG4uZm9vdGVyLWJ1dHRvbjpob3ZlciB7XFxuICBib3gtc2hhZG93OiBpbnNldCAwcHggMHB4IDIwcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4yKTtcXG59XFxuLmZvb3Rlci1idXR0b24tZG93bjphZnRlciB7XFxuICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XFxuICB3aWR0aDogMHB4O1xcbiAgaGVpZ2h0OiAwcHg7XFxuICB2ZXJ0aWNhbC1hbGlnbjogLTJweDtcXG4gIGNvbnRlbnQ6IFxcXCJcXFwiO1xcbiAgYm9yZGVyOiA0cHggc29saWQgdHJhbnNwYXJlbnQ7XFxuICBib3JkZXItdG9wLWNvbG9yOiBjdXJyZW50Y29sb3I7XFxufVxcbi5jb2x1bW4tY2hvb3Nlci1tZW51LWNvbnRhaW5lciB7XFxuICAvKiBwb3NpdGlvbjogYWJzb2x1dGU7ICovXFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxuICB3aWR0aDogMjAwcHg7XFxuICBoZWlnaHQ6IG1pbi1jb250ZW50O1xcbiAgLyogdG9wOiAwcHg7ICovXFxuICAvKiBib3R0b206IDBweDsgKi9cXG4gIGxlZnQ6IDBweDtcXG4gIC8qIHJpZ2h0OiAwcHg7ICovXFxuICAvKiBiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsMCwwLC41KTsgKi9cXG4gIHotaW5kZXg6IDk5O1xcbiAgdmlzaWJpbGl0eTogdmlzaWJsZTtcXG59XFxuLmNvbHVtbi1jaG9vc2VyLW1lbnUge1xcbiAgbWFyZ2luLXRvcDogYXV0bztcXG4gIG1hcmdpbi1ib3R0b206IGF1dG87XFxuICBvdmVyZmxvdzogaGlkZGVuO1xcbiAgY29sb3I6IGJsYWNrO1xcbiAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgxMDAsIDEwMCwgMTAwLCAwLjUpO1xcbiAgYm9yZGVyLXJhZGl1czogNXB4O1xcbiAgbGlzdC1zdHlsZTogbm9uZTtcXG4gIHBhZGRpbmctbGVmdDogMHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogbGlnaHRncmF5O1xcbiAgYm94LXNoYWRvdzogMXB4IDJweCAxMHB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMik7XFxufVxcbi5jb2x1bW4tY2hvb3Nlci1tZW51LWNvbnRhaW5lci5oaWRkZW4ge1xcbiAgdmlzaWJpbGl0eTogaGlkZGVuO1xcbiAgaGVpZ2h0OiAwcHg7XFxufVxcbi5jb2x1bW4tY2hvb3Nlci1pdGVtIHtcXG4gIGJhY2tncm91bmQtY29sb3I6IHdoaXRlO1xcbiAgLyogYm9yZGVyLXJhZGl1czogNXB4OyAqL1xcbiAgbWFyZ2luLXRvcDogMXB4O1xcbiAgdXNlci1zZWxlY3Q6IG5vbmU7XFxuICB3aGl0ZS1zcGFjZTogbm93cmFwO1xcbn1cXG4uY29sdW1uLWNob29zZXItaXRlbTpmaXJzdC1jaGlsZCB7XFxuICBtYXJnaW4tdG9wOiAwcHg7XFxufVxcbi5jb2x1bW4tY2hvb3Nlci1pdGVtOmhvdmVyIHtcXG4gIGJhY2tncm91bmQtY29sb3I6IGxpZ2h0Ymx1ZTtcXG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICBiYWNrZ3JvdW5kLWNsaXA6IHBhZGRpbmctYm94O1xcbiAgYm9yZGVyLXJhZGl1czogNXB4O1xcbn1cXG4uY29sdW1uLWNob29zZXItaXRlbT5sYWJlbCB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG4gIHBhZGRpbmc6IDVweCAyMHB4IDVweCA1cHg7XFxufVxcbi5wYWdlLWNob29zZXIge1xcbiAgZGlzcGxheTogZ3JpZDtcXG4gIGdyaWQtdGVtcGxhdGUtcm93czogYXV0bztcXG4gIGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KDksIGF1dG8pO1xcbiAgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTtcXG4gIGdyaWQtY29sdW1uOiAtMTtcXG4gIGJvcmRlci1sZWZ0OiBub25lO1xcbiAgcG9zaXRpb246IHN0aWNreTtcXG4gIHJpZ2h0OiAwcHg7XFxufVxcbi5wYWdlLWNob29zZXIuc2VsZWN0ZWQge1xcbiAgYm9yZGVyLWxlZnQ6IDFweCBkb3R0ZWQgZ3JheTtcXG59XFxuLnBhZ2UtY2hhbmdlIHtcXG4gIG1hcmdpbi10b3A6IGF1dG87XFxuICBtYXJnaW4tYm90dG9tOiBhdXRvO1xcbiAgcGFkZGluZy1sZWZ0OiA1cHg7XFxuICBwYWRkaW5nLXJpZ2h0OiA1cHg7XFxufVxcbi5wYWdlLWNoYW5nZTpmaXJzdC1jaGlsZCB7XFxuICBtYXJnaW4tdG9wOiBhdXRvICFpbXBvcnRhbnQ7XFxufVxcbi5wYWdlLWNoYW5nZTpub3QoLnBhZ2UtY2hhbmdlLWRpc2FibGVkKSB7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxufVxcbi5wYWdlLWNoYW5nZS1kaXNhYmxlZCB7XFxuICBjb2xvcjogZ3JheTtcXG59XFxuLmFjdGl2ZS1wYWdlIHtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbn1cXG4ud2d0LWZvb3Rlcl9jZWxsIHtcXG4gIGJvcmRlci1yaWdodDogMXB4IHNvbGlkIGxpZ2h0Z3JheTtcXG4gIHdpZHRoOiBtYXgtY29udGVudDtcXG59XFxuQC1tb3otZG9jdW1lbnQgdXJsLXByZWZpeCgpICB7XFxuICAud2d0LWdyaWQtY29udGFpbmVyIGRpdjpudGgtbGFzdC1jaGlsZCgyKS53Z3QtZGF0YS1jZWxsIHtcXG4gICAgaGVpZ2h0OiAyMDAlO1xcbiAgfVxcblxcbiAgLmZpbHRlcl9uZWdhdG9yIHtcXG4gICAgZm9udC1zaXplOiAxZW07XFxuICB9XFxufVxcblwiOyAocmVxdWlyZShcImJyb3dzZXJpZnktY3NzXCIpLmNyZWF0ZVN0eWxlKGNzcywgeyBcImhyZWZcIjogXCJub2RlX21vZHVsZXNcXFxcd2MtZ3JpZC10YWJsZVxcXFxzcmNcXFxcd2MtZ3JpZC10YWJsZS5jc3NcIiB9LCB7IFwiaW5zZXJ0QXRcIjogXCJib3R0b21cIiB9KSk7IG1vZHVsZS5leHBvcnRzID0gY3NzOyIsIi8vPyBGRUFUVVJFOiBtYXliZSBhZGQgcG9zc2liaWxpdHkgZm9yIGhvcml6b250YWwgaGVhZGVyIGVpdGhlclxyXG4vLz8gVG9wIC0+IERvd24gLSBjc3M6IHsgd3JpdGluZy1tb2RlOiBzaWRld2F5cy1ybCwgdGV4dC1vcmllbnRhdGlvbiA6IHNpZGV3YXlzIH0gb3JcclxuLy8/IEJvdHRvbSAtPiBVcCAtIGNzczogeyB3cml0aW5nLW1vZGU6IHNpZGV3YXlzLWxyLCB0ZXh0LW9yaWVudGF0aW9uIDogc2lkZXdheXMgfVxyXG5cclxuXHJcbi8qKlxyXG4gKiBQcm9qZWN0OiB3Yy1ncmlkLXRhYmxlXHJcbiAqIFJlcG9zaXRvcnk6IGh0dHBzOi8vZ2l0aHViLmNvbS9Sb2JlcnRTZWlkbGVyL3djLWdyaWQtdGFibGVcclxuICogQXV0aGVyOiBSb2JlcnQgU2VpZGxlclxyXG4gKiBFbWFpbDogUm9iZXJ0LlNlaWRsZXIxQGdvb2dsZW1haWwuY29tIFxyXG4gKiBMaWNlbnNlOiBJU0NcclxuICovXHJcblxyXG5yZXF1aXJlKCcuL3djLWdyaWQtdGFibGUuY3NzJyk7XHJcblxyXG4vLyB0ZXN0IGV4Y2VwdGlvbiB0cmFja2VyIHdpdGggYW4gYWN0dWFsIG1vZHVsZS5cclxuLy9UT0RPOiBDb21tZW50IG91dCBiZWZvcmUgcGFja2FnaW5nXHJcbmxldCBhcHBuYW1lID0gJ3djLWdyaWQtdGFibGUnO1xyXG4vLyBsZXQgdHJhY2tlciA9IHJlcXVpcmUoJy4uLy4uL2V4Y2VwdGlvbi10cmFja2VyLXNlcnZlci90ZXN0LWNsaWVudC90cmFja2VyLmpzJylcclxuLy8gICAuVHJhY2tlclxyXG4vLyAgIC5pbmplY3RDb25zb2xlKCdodHRwOi8vbG9jYWxob3N0OjUyMDA1LycsICd3Yy1ncmlkLXRhYmxlJywgdHJ1ZSwgdHJ1ZSwgdHJ1ZSk7XHJcblxyXG5cclxuY29uc3QgeyByZWdleEZpbHRlciwgdGV4dEZpbHRlciwgY29tcGFyZUZpbHRlciB9ID0gcmVxdWlyZSgnLi9maWx0ZXItdXRpbHMuanMnKTtcclxuY29uc3QgeyBjcmVhdGVQYWdlQ2hvb3NlciwgYWRkS2V5SGFuZGxlclRvRG9jdW1lbnQgfSA9IHJlcXVpcmUoJy4vcGFnaW5hdGlvbi11dGlscy5qcycpO1xyXG5jb25zdCBtdXJtdXIgPSByZXF1aXJlKFwibXVybXVyaGFzaC1qc1wiKTtcclxuXHJcbnZhciB0YWJsZUNvdW50ZXIgPSAwO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIC8vIENsb3N1cmUsIHNvIHRoYXQgb25seSBmdW5jdGlvbnMgSSB3YW50IHRvIGV4cG9zZSBhcmUgZ2V0dGluZyBleHBvc2VkLlxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gZGVmaW5lU2V0UHJvdG90eXBlRnVuY3Rpb25zKCkge1xyXG4gICAgICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAgICAgKiBAcGFyYW0ge0l0ZXJhYmxlfSBhbiBpdGVyYWJsZSwgdGhhdCBzaG91bGQgYmUgdW5pb25lZCB3aXRoIHRoZSBzdGFydGluZyBTZXRcclxuICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNldC5wcm90b3R5cGUsICd1bmlvbicsIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24oYW5vdGhlclNldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBlbGVtZW50IG9mIGFub3RoZXJTZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgdGVzdE51bWJlclJlZ2V4ID0gL14oLXswLDF9WzAtOV17MSwzfSg/OltcXC58LF17MCwxfVswLTldezN9KSpbXFwufFxcLF17MCwxfVswLTldKilcXHN7MCwxfVxcRCokL2k7XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBmaXhDb2x1bW5IZWFkZXIodGFibGUsIGNvbF9oZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmhlYWRlci5mb3JFYWNoKChjb2x1bW4pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY29sX2hlYWRlciA9IHRhYmxlLmVsZW1lbnRzLmhlYWRlcltjb2x1bW5dO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9oZWlnaHQgPSBjb2xfaGVhZGVyLm9mZnNldEhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY29sX2hlYWRlci5vZmZzZXRIZWlnaHQgPiAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zdGlja3lTdHlsZS5pbm5lckhUTUwgPSBgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLnRhYmxlLWlkLSR7dGFibGUudGFibGVJZH0gPiAud2d0LWZpbHRlcl9jZWxsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogJHtjb2xfaGVhZGVyLm9mZnNldEhlaWdodH1weDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGA7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRlc3RzIGlmIGEgdmFsdWUgaXMgYSBudW1iZXIsIGJ5IG1hdGNoaW5nIGFnYWluc3QgYSBSZWdleC4gXHJcbiAgICAgICAgICAgICAqIE9uIHN1Y2Nlc3MgdGhlIHRoZSBwYXJzZWQgbnVtYmVyIGlzIHJldHVybmVkLiBcclxuICAgICAgICAgICAgICogT24gdW5kZWZpbmVkIGFuIGVtcHR5IFN0cmluZyBpcyByZXR1cm5lZC5cclxuICAgICAgICAgICAgICogT3RoZXJ3aXNlIHRoZSB0ZXN0U3RyIGlzIHJldHVybmVkIHVucGFyc2VkLiBcclxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHRlc3RTdHIgXHJcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtTdHJpbmcgfCBOdW1iZXJ9IFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZnVuY3Rpb24gdHJ5VHJhbnNmb3JtVG9OdW1iZXIodGVzdFN0cikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRlc3RTdHIgPT0gdW5kZWZpbmVkKSByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgICAgIGxldCBtYXRjaGVzID0gdGVzdE51bWJlclJlZ2V4LmV4ZWModGVzdFN0ci50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgIGxldCByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IE51bWJlci5wYXJzZUZsb2F0KG1hdGNoZXNbMV0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0ZXN0U3RyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIENvbXBhcmUgZnVuY3Rpb24gZm9yIGNvbXBhcmluZyBudW1iZXJzIGZvciBzb3J0aW5nLiBBZGRpdGlvbmFsbHkgdW5kZWZpbmVkIHZhbHVlcyBhcmUgXHJcbiAgICAgICAgICAgICAqIGFsd2F5cyB0aGUgJ3NtYWxsZXInIHZhbHVlLCBzbyB0aGF0IHRoZXkgZ2V0IHNvcnRlZCB0byB0aGUgYm90dG9tLlxyXG4gICAgICAgICAgICAgKiBDYW4gYmUgcmVwbGFjZWQgYnkgc3VwcGx5aW5nIGEgY3VzdG9tIGNvbXBhcmUgZnVuY3Rpb24gdG8gVGFibGVDb21wb25lbnQuY3VzdG9tQ29tcGFyZU51bWJlcnMuXHJcbiAgICAgICAgICAgICAqIFxyXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gYSBudW1iZXIgdG8gY29tcGFyZS4gXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBiIG51bWJlciB0byBjb21wYXJlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZnVuY3Rpb24gY29tcGFyZU51bWJlcnMoYSwgYikge1xyXG4gICAgICAgICAgICAgICAgaWYgKGEgPT0gdW5kZWZpbmVkIHx8IGEgPT09ICcnKSByZXR1cm4gMTtcclxuICAgICAgICAgICAgICAgIGlmIChiID09IHVuZGVmaW5lZCB8fCBiID09PSAnJykgcmV0dXJuIC0xO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyeVRyYW5zZm9ybVRvTnVtYmVyKGIpIC0gdHJ5VHJhbnNmb3JtVG9OdW1iZXIoYSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBDb21wYXJlIGZ1bmN0aW9uIGZvciBjb21wYXJpbmcgc3RyaW5ncyBmb3Igc29ydGluZy4gQWRkaXRpb25hbGx5IHVuZGVmaW5lZCB2YWx1ZXMgYXJlXHJcbiAgICAgICAgICAgICAqIGFsd2F5cyB0aGUgJ3NtYWxsZXInIHZhbHVlLCBzbyB0aGF0IHRoZXkgZ2V0IHNvcnRlZCB0byB0aGUgYm90dG9tLiBcclxuICAgICAgICAgICAgICogQ2FuIGJlIHJlcGxhY2VkIGJ5IHN1cHBseWluZyBhIGN1c3RvbSBjb21wYXJlIGZ1bmN0aW9uIHRvIFRhYmxlQ29tcG9uZW50LmN1c3RvbUNvbXBhcmVUZXh0LlxyXG4gICAgICAgICAgICAgKiBcclxuICAgICAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGEgdGV4dCB0byBjb21wYXJlLlxyXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gYiB0ZXh0IHRvIGNvbXBhcmUuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBmdW5jdGlvbiBjb21wYXJlVGV4dChhLCBiKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0gMDtcclxuICAgICAgICAgICAgICAgIGlmIChhID09IHVuZGVmaW5lZCB8fCBhID09PSAnJykgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICBpZiAoYiA9PSB1bmRlZmluZWQgfHwgYiA9PT0gJycpIHJldHVybiAtMTtcclxuICAgICAgICAgICAgICAgIGlmIChhLnRvU3RyaW5nKCkgPiBiLnRvU3RyaW5nKCkpIHJlc3VsdCA9IC0xO1xyXG4gICAgICAgICAgICAgICAgaWYgKGEudG9TdHJpbmcoKSA8IGIudG9TdHJpbmcoKSkgcmVzdWx0ID0gMTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBNYXAgZGlmZmVyZW50IGNvbXBhcmUgZnVuY3Rpb25zLCBkZXBlbmRpbmcgb24gdGhlIGNvbnRlbnQgb2YgdGhpcyBjb2x1bW4uIERlZmF1bHQgaXMgYSBkaXN0aW5jdGlvbiBiZXR3ZWVuIG51bWJlcnMgYW5kIHRleHQuXHJcbiAgICAgICAgICAgICAqIFRoZSBjaG9vc2VTb3J0Q29tcGFyZUZuIGFzIHdlbGwgYXMgdGhlIGNvbXBhcmVOdW1iZXJzIGFuZCBjb21wYXJlVGV4dCBmdW5jdGlvbnMgY2FuIGJlIHJlcGxhY2VkIGJ5IGN1c3RvbSBvbmVzLlxyXG4gICAgICAgICAgICAgKiBjaG9vc2VTb3J0Q29tcGFyZUZuIC0+IFRhYmxlQ29tcG9uZW50LmN1c3RvbUNob29zZVNvcnRzQ29tcGFyZUZuXHJcbiAgICAgICAgICAgICAqIFxyXG4gICAgICAgICAgICAgKiBAcGFyYW0ge1RhYmxlQ29tcG9uZW50fSB0YWJsZSB0aGUgYWN0aXZlIGluc3RhbmNlIG9mIFRhYmxlQ29tcG9uZW50LlxyXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0FycmF5PE9iamVjdD59IGRhdGEgXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb2x1bW4gdGhlIGNvbHVtbiBuYW1lIChoZWFkZXIpIGZvciB3aGljaCBhIGNvbXBhcmUgZnVuY3Rpb24gaXMgdG8gY2hvb3NlLiBcclxuICAgICAgICAgICAgICogQHJldHVybnMgeyhhOiBzdHJpbmcsIGI6IHN0cmluZykgPT4gbnVtYmVyIHwgKGE6IG51bWJlciwgYjogbnVtYmVyKSA9PiBudW1iZXJ9IHRoZSBjb21wYXJlIGZ1bmN0aW9uIHRvIGJlIHVzZWRcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNob29zZVNvcnRzQ29tcGFyZUZuKHRhYmxlLCBkYXRhLCBjb2x1bW4pIHtcclxuICAgICAgICAgICAgICAgIC8vIGlmKCFOdW1iZXIuaXNOYU4oZGF0YS5yZWR1Y2UoKGNvbCwgY3VyKSA9PiAoY29sICs9IGN1cltjb2x1bW5dICE9IHVuZGVmaW5lZCA/IE51bWJlci5wYXJzZUZsb2F0KGN1cltjb2x1bW5dKSA6IDApLCAwKSkpe1xyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZXZlcnkocm93ID0+ICh0eXBlb2YodHJ5VHJhbnNmb3JtVG9OdW1iZXIocm93W2NvbHVtbl0pKSA9PSAnbnVtYmVyJyB8fCByb3dbY29sdW1uXSA9PSB1bmRlZmluZWQgfHwgcm93W2NvbHVtbl0udHJpbSgpID09IFwiXCIpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YWJsZS5jdXN0b21Db21wYXJlTnVtYmVyc1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFibGUuY3VzdG9tQ29tcGFyZVRleHRcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFJlZ2lzdGVyIHRoZSBUYWJsZUNvbXBvbmVudCB0byB0aGUgY3VzdG9tRWxlbWVudFJlZ2lzdHJ5LCBzbyB0aGF0IGl0IGNhbiBiZSB1c2VkIGFzIGEgV2ViQ29tcG9uZW50LlxyXG4gICAgICAgICAgICAgKiBcclxuICAgICAgICAgICAgICogQHBhcmFtIHtjbGFzc30gVGFibGVDb21wb25lbnQgXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBmdW5jdGlvbiBkZWZpbmVDdXN0b21FbGVtZW50KCkge1xyXG4gICAgICAgICAgICAgICAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd3Yy1ncmlkLXRhYmxlJywgVGFibGVDb21wb25lbnQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBvblNvcnRDbGljayh0YWJsZSwgY29sdW1uLCBldmVudCwgZG9SZWRyYXcpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0YWJsZS5oZWFkZXIuaW5jbHVkZXMoY29sdW1uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YWJsZS5zb3J0ZWRCeS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YWJsZS5zb3J0ZWRCeVswXS5jb2wgPT09IGNvbHVtbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuc29ydGVkQnlbMF0uZGlyID0gdGFibGUuc29ydGVkQnlbMF0uZGlyID09PSBcImFzY1wiID8gXCJkZXNjXCIgOiBcImFzY1wiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLmlubmVySFRNTCA9IHRhYmxlLnNvcnRlZEJ5WzBdLmRpciA9PT0gXCJhc2NcIiA/IFwiJnVhcnI7XCIgOiBcIiZkYXJyO1wiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFibGUuc29ydGVkRGF0YSA9IFtdLmNvbmNhdCh0YWJsZS5zb3J0ZWREYXRhLmZpbHRlcihlbnRyeSA9PiBlbnRyeVtjb2x1bW5dICE9IHVuZGVmaW5lZCkucmV2ZXJzZSgpLCB0YWJsZS5zb3J0ZWREYXRhLmZpbHRlcihlbnRyeSA9PiBlbnRyeVtjb2x1bW5dID09IHVuZGVmaW5lZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGFibGUucmVkcmF3RGF0YSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuaGVhZGVyLmZpbHRlcihoZWFkZXJfa2V5ID0+IGhlYWRlcl9rZXkgIT09IGNvbHVtbikuZm9yRWFjaChoZWFkZXJfa2V5ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFibGUuZWxlbWVudHMuc29ydEFycm93c1toZWFkZXJfa2V5XS5pbm5lckhUTUwgIT09ICcmIzg2OTM7Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2hlYWRlcl9rZXldLmFycm93QWxwaGFDb2xvciA9IHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbaGVhZGVyX2tleV0uYXJyb3dBbHBoYUNvbG9yICogMC41O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2hlYWRlcl9rZXldLnN0eWxlLmNvbG9yID0gYHJnYigwLCAwLCAwLCAke3RhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbaGVhZGVyX2tleV0uYXJyb3dBbHBoYUNvbG9yfSlgO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuc29ydGVkQnkgPSBbXS5jb25jYXQoW25ldyBPYmplY3QoeyBjb2w6IGNvbHVtbiwgZGlyOiBcImFzY1wiIH0pXSwgdGFibGUuc29ydGVkQnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5pbm5lckhUTUwgPSB0YWJsZS5zb3J0ZWRCeVswXS5kaXIgPT09IFwiYXNjXCIgPyBcIiZ1YXJyO1wiIDogXCImZGFycjtcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLmFycm93QWxwaGFDb2xvciA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5zdHlsZS5jb2xvciA9IGByZ2IoMCwgMCwgMCwgJHt0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2NvbHVtbl0uYXJyb3dBbHBoYUNvbG9yfSlgO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLnNvcnRlZEJ5ID0gW10uY29uY2F0KHRhYmxlLnNvcnRlZEJ5LCBbbmV3IE9iamVjdCh7IGNvbDogY29sdW1uLCBkaXI6IFwiYXNjXCIgfSldKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLmlubmVySFRNTCA9IFwiJnVhcnI7XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5hcnJvd0FscGhhQ29sb3IgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2NvbHVtbl0uc3R5bGUuY29sb3IgPSBgcmdiKDAsIDAsIDAsICR7dGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLmFycm93QWxwaGFDb2xvcn0pYDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUuc2VyaWFsaXplTGlua09wdGlvbnMoKVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkb1JlZHJhdykgdGFibGUucmVkcmF3RGF0YSgpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiB0cmFuc2Zvcm1Ub0dyb3VwZWREYXRhKGluaXRpYWxEYXRhLCBncm91cENvbHVtbnMpIHtcclxuICAgICAgICAgICAgICAgIGxldCBncm91cHMgPSBpbml0aWFsRGF0YS5tYXAoZnVsbFJvdyA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXN1bHQgPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JvdXBDb2x1bW5zLmZvckVhY2goZ3JvdXBDb2x1bW4gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0W2dyb3VwQ29sdW1uXSA9IGZ1bGxSb3dbZ3JvdXBDb2x1bW5dO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgIC5yZWR1Y2UoKGNvbCwgY3VyKSA9PiAoIWNvbC5pbmNsdWRlcyhjdXIpID8gW10uY29uY2F0KGNvbCwgW2N1cl0pIDogY29sKSwgW10pO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGdyb3Vwcyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGZpbHRlckNoYW5nZWQodGFibGUsIGNvbHVtbiwgZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPSAxO1xyXG4gICAgICAgICAgICAgICAgdGFibGUuZmlsdGVyW2NvbHVtbl0gPSBldmVudC5zcmNFbGVtZW50LnRleHRDb250ZW50O1xyXG4gICAgICAgICAgICAgICAgdGFibGUucmVkcmF3RGF0YSgpO1xyXG4gICAgICAgICAgICAgICAgdGFibGUuc2VyaWFsaXplTGlua09wdGlvbnMoKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogdGFibGUuZmlsdGVyTmVnYXRlW2NvbHVtbl0gPT09IHVuZGVmaW5lZCBzaGFsbCBiZSBlcXVhbCB0byAnY29udGFpbnMnLlxyXG4gICAgICAgICAgICAgKiBAcGFyYW0geyp9IHRhYmxlIFxyXG4gICAgICAgICAgICAgKiBAcGFyYW0geyp9IGNvbHVtbiBcclxuICAgICAgICAgICAgICogQHBhcmFtIHsqfSBldmVudCBcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHRvZ2dsZUZpbHRlck5lZ2F0b3IodGFibGUsIGNvbHVtbiwgcmV2ZXJzZSwgZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3T3BlcmF0aW9uID0gdGFibGUuYWN0aXZlRmlsdGVyT3BlcmF0aW9uc1tjb2x1bW5dO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5ld09wZXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8IG5ld09wZXJhdGlvbiA9PSAnJykgbmV3T3BlcmF0aW9uID0gdGFibGUuZmlsdGVyT3BlcmF0aW9uc1swXS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgbmV3T3BlcmF0aW9uID0gdGFibGUuZmlsdGVyT3BlcmF0aW9uc1sodGFibGUuZmlsdGVyT3BlcmF0aW9ucy5maW5kSW5kZXgoZWxlbWVudCA9PiAoZWxlbWVudC5uYW1lID09IG5ld09wZXJhdGlvbikpICsgdGFibGUuZmlsdGVyT3BlcmF0aW9ucy5sZW5ndGggKyAocmV2ZXJzZSA/IC0xIDogMSkpICUgdGFibGUuZmlsdGVyT3BlcmF0aW9ucy5sZW5ndGhdLm5hbWU7XHJcbiAgICAgICAgICAgICAgICBpZiAodGFibGUuZWxlbWVudHMuZmlsdGVyT3BlcmF0aW9uc1tjb2x1bW5dKSB0YWJsZS5lbGVtZW50cy5maWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0uaW5uZXJIVE1MID0gdGFibGUuZmlsdGVyT3BlcmF0aW9ucy5maW5kKG9wID0+IG9wLm5hbWUgPT0gbmV3T3BlcmF0aW9uKS5jaGFyO1xyXG4gICAgICAgICAgICAgICAgdGFibGUuYWN0aXZlRmlsdGVyT3BlcmF0aW9uc1tjb2x1bW5dID0gbmV3T3BlcmF0aW9uO1xyXG4gICAgICAgICAgICAgICAgdGFibGUucmVkcmF3RGF0YSgpO1xyXG4gICAgICAgICAgICAgICAgdGFibGUuc2VyaWFsaXplTGlua09wdGlvbnMoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gc2V0VXBTb3J0aW5nKGVsZW1lbnQsIGNvbHVtbiwgdGFibGUpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IG9uU29ydENsaWNrKHRhYmxlLCBjb2x1bW4sIGV2ZW50LCB0cnVlKSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gY3JlYXRlSGVhZGVyVG9vbHRpcCh0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHRvb2x0aXAgPSB0YWJsZS5lbGVtZW50cy50b29sdGlwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICB0b29sdGlwLnN0YXRlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldExlZnQ6IDBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRvb2x0aXAuY2xhc3NMaXN0LmFkZCgnaGVhZGVyLWNvbC10b29sdGlwJyk7XHJcbiAgICAgICAgICAgICAgICB0b29sdGlwLmNsYXNzTGlzdC5hZGQoJ3dndC1jZWxsJyk7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5hcHBlbmQodG9vbHRpcClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gb25IZWFkZXJNb3VzZUVudGVyKHRhYmxlLCBjb2x1bW5FbGVtZW50LCBjb2x1bW5OYW1lKSB7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy50b29sdGlwLmlubmVySFRNTCA9IGNvbHVtbk5hbWU7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy50b29sdGlwLnN0YXRlLm9mZnNldExlZnQgPSBjb2x1bW5FbGVtZW50Lm9mZnNldExlZnQ7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy50b29sdGlwLnN0eWxlLmxlZnQgPSBgJHsoY29sdW1uRWxlbWVudC5vZmZzZXRMZWZ0KSAtIHRhYmxlLnNjcm9sbExlZnR9cHhgO1xyXG4gICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMudG9vbHRpcC5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIG9uSGVhZGVyTW91c2VMZWF2ZSh0YWJsZSwgY29sdW1uRWxlbWVudCwgY29sdW1uTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMudG9vbHRpcC5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNyZWF0ZUhlYWRlcih0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvbF9oZWlnaHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgY3JlYXRlSGVhZGVyVG9vbHRpcCh0YWJsZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRhYmxlLmVsZW1lbnRzLmhlYWRlcikgdGFibGUuZWxlbWVudHMuaGVhZGVyID0ge307XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5oZWFkZXIuZm9yRWFjaCgoY29sdW1uLCBjb2x1bW5JbmRleCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjb2xfaGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29sX2hlYWRlci5jbGFzc0xpc3QuYWRkKCd3Z3QtaGVhZGVyJylcclxuICAgICAgICAgICAgICAgICAgICBjb2xfaGVhZGVyLmNsYXNzTGlzdC5hZGQoYHdndC1jb2x1bW5fJHtjb2x1bW4uc3BsaXQoJyAnKS5qb2luKCdfJyl9YClcclxuICAgICAgICAgICAgICAgICAgICBjb2xfaGVhZGVyLmNsYXNzTGlzdC5hZGQoJ3dndC1jZWxsJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbF9jb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgICAgICBjb2xfY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3dndC1jb2wtaGVhZGVyLWNvbnRhaW5lcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9jb250YWluZXIuaW5uZXJIVE1MID0gY29sdW1uO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9oZWFkZXIuYXBwZW5kKGNvbF9jb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9oZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsIG9uSGVhZGVyTW91c2VFbnRlci5iaW5kKHRoaXMsIHRhYmxlLCBjb2xfaGVhZGVyLCBjb2x1bW4pKTtcclxuICAgICAgICAgICAgICAgICAgICBjb2xfaGVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCBvbkhlYWRlck1vdXNlTGVhdmUuYmluZCh0aGlzLCB0YWJsZSwgY29sX2hlYWRlciwgY29sdW1uKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUuYXBwZW5kKGNvbF9oZWFkZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgY29sX2hlaWdodCA9IGNvbF9oZWFkZXIub2Zmc2V0SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzb3J0X2Fycm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgc29ydF9hcnJvdy5jbGFzc0xpc3QuYWRkKCdhcnJvdycpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNvcnRfYXJyb3cuaW5uZXJIVE1MID0gJyYjODY5MzsnO1xyXG4gICAgICAgICAgICAgICAgICAgIHNvcnRfYXJyb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uSGVhZGVyTW91c2VMZWF2ZSh0YWJsZSwgY29sX2hlYWRlciwgY29sdW1uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc29ydF9hcnJvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJywgb25IZWFkZXJNb3VzZUVudGVyLmJpbmQodGhpcywgdGFibGUsIGNvbF9oZWFkZXIsIGNvbHVtbikpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmhlYWRlcltjb2x1bW5dID0gY29sX2hlYWRlcjtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2NvbHVtbl0gPSBzb3J0X2Fycm93O1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFVwU29ydGluZyhzb3J0X2Fycm93LCBjb2x1bW4sIHRhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9oZWFkZXIuYXBwZW5kKHNvcnRfYXJyb3cpXHJcblxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy50b29sdGlwLnN0eWxlLmxlZnQgPSBgJHsodGFibGUuZWxlbWVudHMudG9vbHRpcC5zdGF0ZS5vZmZzZXRMZWZ0KSAtIHRhYmxlLnNjcm9sbExlZnR9cHhgO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LmRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGV2ZW50LmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGFPYmogPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpOyAvLyBkYXRhT2JqID0ge3R5cGU6ICdmaXgtY29sdW1ucycsIGVsZW1lbnQ6IHVuZGVmaW5lZCwgZGF0YTogdW5kZWZpbmVkfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFPYmoudHlwZSA9PT0gJ2ZpeC1jb2x1bW5zJykgZml4Q29sdW1uSGVhZGVyKHRhYmxlLCBjb2xfaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnJvci5uYW1lID09ICdTeW50YXhFcnJvcicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZ25vcmUganNvbiBwYXJzZSBlcnJvcnM7IGFsbCBtZXNzYWdlcyBmcm9tIG1lIHVzZSBqc29uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZpeENvbHVtbkhlYWRlci5iaW5kKHRoaXMsIHRhYmxlLCBjb2xfaGVpZ2h0KSwgMTAwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlU3RpY2t5RmlsdGVyU3R5bGUodGFibGUsIGNvbF9oZWlnaHQpO1xyXG4gICAgICAgICAgICAgICAgfSk7IC8vIGNyZWF0ZVN0aWNreUZpbHRlclN0eWxlKHRhYmxlLCBjb2xfaGVpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gY3JlYXRlU3RpY2t5RmlsdGVyU3R5bGUodGFibGUsIGNvbF9oZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIGxldCB0bXBfc3R5bGUgPSB0YWJsZS5lbGVtZW50cy5zdGlja3lTdHlsZTtcclxuICAgICAgICAgICAgICAgIGlmICghdG1wX3N0eWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc3RpY2t5U3R5bGUgPSB0bXBfc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRtcF9zdHlsZS50eXBlID0gXCJ0ZXh0L2Nzc1wiO1xyXG4gICAgICAgICAgICAgICAgICAgIHRtcF9zdHlsZS5jbGFzc0xpc3QuYWRkKCdzdGlja3lfZmlsdGVyX29mZnNldCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdG1wX3N0eWxlLmlubmVySFRNTCA9IGBcclxuICAgICAgLnRhYmxlLWlkLSR7dGFibGUudGFibGVJZH0gPiAud2d0LWZpbHRlcl9jZWxsIHtcclxuICAgICAgICB0b3A6ICR7Y29sX2hlaWdodH1weDtcclxuICAgICAgfVxyXG4gICAgYDtcclxuICAgICAgICAgICAgICAgIHRhYmxlLnJvb3RfZG9jdW1lbnQuaGVhZC5hcHBlbmQodG1wX3N0eWxlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gY3JlYXRlRmlsdGVyKHRhYmxlLCBoZWFkZXIsIGZpbHRlcikge1xyXG4gICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuZmlsdGVyQ2VsbHMgPSB7fTtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmZpbHRlck9wZXJhdGlvbnMgPSB7fTtcclxuICAgICAgICAgICAgICAgIGhlYWRlci5mb3JFYWNoKGNvbHVtbiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbHRlcl9jb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBsZXQgZmlsdGVyX2lucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXJfaW5wdXQudHlwZSA9ICd0ZXh0JztcclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXJfaW5wdXQuY2xhc3NMaXN0LmFkZCgnd2d0LWZpbHRlcl9pbnB1dCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbHRlcl9pbnB1dC52YWx1ZSA9IGZpbHRlcltjb2x1bW5dID8gZmlsdGVyW2NvbHVtbl0gOiAnJztcclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXJfY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgZXZlbnQgPT4gZmlsdGVyQ2hhbmdlZC5iaW5kKG51bGwsIHRhYmxlLCBjb2x1bW4pKGV2ZW50KSlcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJfY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3dndC1maWx0ZXJfY2VsbCcsIGB3Z3QtZmlsdGVyX2NlbGxfJHtjb2x1bW4uc3BsaXQoJyAnKS5qb2luKCdfJyl9YCwgJ3dndC1maWx0ZXJfaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXJfY29udGFpbmVyLmNvbnRlbnRFZGl0YWJsZSA9ICd0cnVlJztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbHRlcl9pbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyX2lucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgZXZlbnQgPT4gZmlsdGVyQ2hhbmdlZC5iaW5kKG51bGwsIHRhYmxlLCBjb2x1bW4pKGV2ZW50KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyX2lucHV0LmNsYXNzTGlzdC5hZGQoJ2ZpbHRlcl9pbnB1dCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcl9pbnB1dC5jb250ZW50RWRpdGFibGUgPSAndHJ1ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbHRlcl9uZWdhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5maWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0gPSBmaWx0ZXJfbmVnYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcl9uZWdhdGUuaW5uZXJIVE1MID0gJyZzdWJlOyc7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyX25lZ2F0ZS5jbGFzc0xpc3QuYWRkKCdmaWx0ZXJfbmVnYXRvcicpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJfbmVnYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZXZlbnQgPT4gdG9nZ2xlRmlsdGVyTmVnYXRvci5iaW5kKG51bGwsIHRhYmxlLCBjb2x1bW4sIGZhbHNlKShldmVudCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcl9uZWdhdGUuYWRkRXZlbnRMaXN0ZW5lcignY29udGV4dG1lbnUnLCBldmVudCA9PiB0b2dnbGVGaWx0ZXJOZWdhdG9yLmJpbmQobnVsbCwgdGFibGUsIGNvbHVtbiwgdHJ1ZSkoZXZlbnQpKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXJfbmVnYXRlLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXJfbmVnYXRlLnN0eWxlLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbHRlcl9jb250YWluZXIuYXBwZW5kKGZpbHRlcl9pbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyX2NvbnRhaW5lci5hcHBlbmQoZmlsdGVyX2lucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJfY29udGFpbmVyLmFwcGVuZChmaWx0ZXJfbmVnYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5maWx0ZXJDZWxsc1tjb2x1bW5dID0gZmlsdGVyX2NvbnRhaW5lcjtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZS5hcHBlbmQoZmlsdGVyX2NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBjcmVhdGVSZXNldExpbmtCdXR0b24odGFibGUpIHtcclxuICAgICAgICAgICAgICAgIGxldCBidG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgIGJ0bi5jbGFzc0xpc3QuYWRkKCdmb290ZXItYnV0dG9uJywgJ3dndC1mb290ZXItY2VsbCcsICd3Z3QtY2VsbCcpO1xyXG4gICAgICAgICAgICAgICAgYnRuLmlubmVySFRNTCA9ICdyZXNldCc7XHJcbiAgICAgICAgICAgICAgICBidG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25maXJtKCdTaWNoZXIsIGRhc3MgYWxsZSBhbmdld2VuZGV0ZW4gVW1mb3JtdW5nZW4genVyw7xja2dlc2V0enQgd2VyZGVuIHNvbGxlbicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB1cmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmwuc2VhcmNoID0gJz8nICsgdXJsLnNlYXJjaC5zbGljZSgxKS5zcGxpdCgnJicpLmZpbHRlcihlbnRyeSA9PiAhZW50cnkuc3BsaXQoJz0nKVswXS5zdGFydHNXaXRoKCd0YWJsZScpKS5qb2luKCcmJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmhyZWYgPSB1cmwuaHJlZjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBidG47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNyZWF0ZUZvb3Rlcih0YWJsZSwgZGF0YSwgcGFnZUNob29zZXIpIHtcclxuICAgICAgICAgICAgICAgIGJpbmRDb2x1bW5DaG9vc2VySGFuZGxlcih0YWJsZSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgZm9vdGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICBmb290ZXIuY2xhc3NMaXN0LmFkZCgnd2d0LWZvb3RlcicpXHJcbiAgICAgICAgICAgICAgICBmb290ZXIuc3R5bGUuZ3JpZENvbHVtbiA9IGAxIC8gJHt0YWJsZS5oZWFkZXIubGVuZ3RoICsgMX1gXHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCF0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyTWVudUNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJNZW51Q29udGFpbmVyID0gY3JlYXRlQ29sdW1uQ2hvb3Nlck1lbnVDb250YWluZXIodGFibGUsIHRhYmxlLmhlYWRlckFsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUucGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUodGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3Nlck1lbnVDb250YWluZXIsIHRhYmxlLm5leHRTaWJsaW5nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdG90YWxfcm93cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgdG90YWxfcm93cy5pbm5lckhUTUwgPSBgVG90YWw6ICR7dGFibGUuZGF0YS5sZW5ndGh9YDtcclxuICAgICAgICAgICAgICAgIHRvdGFsX3Jvd3MuY2xhc3NMaXN0LmFkZCgnd2d0LWZvb3Rlcl9jZWxsJywgJ3dndC1jZWxsJylcclxuICAgICAgICAgICAgICAgIGZvb3Rlci5hcHBlbmQodG90YWxfcm93cylcclxuICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnRvdGFsX3Jvd3MgPSB0b3RhbF9yb3dzO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0YWJsZS5kYXRhLmxlbmd0aCAhPT0gZGF0YS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZmlsdGVyZWRfcm93X2NvdW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWRfcm93X2NvdW50LmlubmVySFRNTCA9IGBGaWx0ZXJlZDogJHtkYXRhLmxlbmd0aH0ke3RhYmxlLnBhZ2luYXRpb24uYWN0aXZlID8gYCAvICR7dGFibGUucGFnaW5hdGlvbi5maWx0ZXJlZERhdGFDb3VudH1gIDogJyd9YDtcclxuICAgICAgZmlsdGVyZWRfcm93X2NvdW50LmNsYXNzTGlzdC5hZGQoJ3dndC1mb290ZXJfY2VsbCcsICd3Z3QtY2VsbCcpXHJcbiAgICAgIGZvb3Rlci5hcHBlbmQoZmlsdGVyZWRfcm93X2NvdW50KVxyXG4gICAgICB0YWJsZS5lbGVtZW50cy5maWx0ZXJlZF9yb3dfY291bnQgPSBmaWx0ZXJlZF9yb3dfY291bnQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmKGZvb3RlcikgZm9vdGVyLmFwcGVuZChjcmVhdGVDb2x1bW5DaG9vc2VyQnV0dG9uKHRhYmxlKSk7XHJcbiAgICBpZih0YWJsZS5kcmF3T3B0aW9uYWxzLnJld3JpdGV1cmwpIGZvb3Rlci5hcHBlbmQoY3JlYXRlUmVzZXRMaW5rQnV0dG9uKHRhYmxlKSk7XHJcbiAgICBpZihwYWdlQ2hvb3NlcikgZm9vdGVyLmFwcGVuZChwYWdlQ2hvb3Nlcik7XHJcbiAgICBpZih0YWJsZS5lbGVtZW50cy5mb290ZXIpIHRhYmxlLmVsZW1lbnRzLmZvb3Rlci5yZW1vdmUoKTtcclxuICAgIHRhYmxlLmVsZW1lbnRzLmZvb3RlciA9IGZvb3RlcjtcclxuICAgIHRhYmxlLmFwcGVuZChmb290ZXIpO1xyXG4gIH1cclxuXHJcbiAgbGV0IGJvdW5kQ29sdW1uQ2hvb3NlckJ1dHRvbkhhbmRsZXIgPSB1bmRlZmluZWQ7XHJcbiAgbGV0IGJvdW5kQ29sdW1uQ2hvb3Nlck91dHNpZGVIYW5kbGVyID0gdW5kZWZpbmVkO1xyXG4gIGxldCBib3VuZENvbHVtbkNob29zZXJDaGFuZ2VDb2x1bW5IYW5kbGVyID0gdW5kZWZpbmVkO1xyXG5cclxuICBmdW5jdGlvbiBiaW5kQ29sdW1uQ2hvb3NlckhhbmRsZXIodGFibGUpe1xyXG4gICAgYm91bmRDb2x1bW5DaG9vc2VyQnV0dG9uSGFuZGxlciA9IG9uQ29sdW1uQ2hvb3NlckJ1dHRvbkhhbmRsZXIuYmluZChudWxsLCB0YWJsZSk7XHJcbiAgICBib3VuZENvbHVtbkNob29zZXJPdXRzaWRlSGFuZGxlciA9IG9uQ29sdW1uQ2hvb3Nlck91dHNpZGVIYW5kbGVyLmJpbmQobnVsbCwgdGFibGUpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY3JlYXRlQ29sdW1uQ2hvb3NlckJ1dHRvbih0YWJsZSl7XHJcbiAgICBsZXQgYnV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICBidXQuY2xhc3NMaXN0LmFkZCgnd2d0LWZvb3Rlcl9jZWxsJywgJ3dndC1jZWxsJywgJ2Zvb3Rlci1idXR0b24tZG93bicsICdmb290ZXItYnV0dG9uJyk7XHJcbiAgICBidXQuaW5uZXJIVE1MID0gJ2NvbHVtbnMnO1xyXG4gICAgYnV0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYm91bmRDb2x1bW5DaG9vc2VyQnV0dG9uSGFuZGxlcik7XHJcbiAgICByZXR1cm4gYnV0OyAgICBcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNyZWF0ZUNvbHVtbkNob29zZXJNZW51SXRlbXModGFibGUsIGNvbHVtbil7XHJcbiAgICBsZXQgY29sSXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XHJcbiAgICBjb2xJdGVtLmNsYXNzTGlzdC5hZGQoJ2NvbHVtbi1jaG9vc2VyLWl0ZW0nLCAnY29sdW1uLWNob29zZXInKTtcclxuICAgIGxldCBsYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XHJcbiAgICBsYWJlbC5pbm5lckhUTUwgPSBjb2x1bW47XHJcbiAgICBsYWJlbC5zZXRBdHRyaWJ1dGUoJ25hbWUnLCBjb2x1bW4gKyAnX2NoZWNrYm94Jyk7XHJcbiAgICBsYWJlbC5jbGFzc0xpc3QuYWRkKCdjb2x1bW4tY2hvb3NlcicpO1xyXG4gICAgbGV0IGNoZWNrQm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcclxuICAgIGNoZWNrQm94LnNldEF0dHJpYnV0ZSgndHlwZScsICdjaGVja2JveCcpO1xyXG4gICAgY2hlY2tCb3guc2V0QXR0cmlidXRlKCduYW1lJywgY29sdW1uICsgJ19jaGVja2JveCcpO1xyXG4gICAgaWYoIXRhYmxlLmhpZGRlbkNvbHVtbnMuaW5jbHVkZXMoY29sdW1uKSB8fCB0YWJsZS52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhjb2x1bW4pKXtcclxuICAgICAgY2hlY2tCb3gudG9nZ2xlQXR0cmlidXRlKCdjaGVja2VkJyk7XHJcbiAgICB9XHJcbiAgICBjaGVja0JveC5jbGFzc0xpc3QuYWRkKCdjb2x1bW4tY2hvb3NlcicpO1xyXG4gICAgYm91bmRDb2x1bW5DaG9vc2VyQ2hhbmdlQ29sdW1uSGFuZGxlciA9IG9uQ29sdW1uQ2hvb3NlckNoYW5nZUNvbHVtbkhhbmRsZXIuYmluZChudWxsLCB0YWJsZSwgY29sdW1uKTtcclxuICAgIGNoZWNrQm94LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGJvdW5kQ29sdW1uQ2hvb3NlckNoYW5nZUNvbHVtbkhhbmRsZXIpO1xyXG4gICAgdGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3NlckNoZWNrYm94W2NvbHVtbl0gPSBjaGVja0JveDtcclxuICAgIGxhYmVsLnByZXBlbmQoY2hlY2tCb3gpO1xyXG4gICAgLy8gbGFiZWwuaW5uZXJIVE1MICs9IGNvbHVtbjsgXHJcbiAgICBjb2xJdGVtLmFwcGVuZChsYWJlbCk7XHJcbiAgICByZXR1cm4gY29sSXRlbTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNyZWF0ZUNvbHVtbkNob29zZXJNZW51Q29udGFpbmVyKHRhYmxlLCBhbGxIZWFkZXIpe1xyXG4gICAgaWYoIXRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJDaGVja2JveCkgdGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3NlckNoZWNrYm94ID0ge307XHJcbiAgICBsZXQgbWVudSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XHJcbiAgICBtZW51LmNsYXNzTGlzdC5hZGQoJ2NvbHVtbi1jaG9vc2VyLW1lbnUnLCAnY29sdW1uLWNob29zZXInKTtcclxuICAgIGxldCBtZW51Q29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICBtZW51Q29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2NvbHVtbi1jaG9vc2VyLW1lbnUtY29udGFpbmVyJywgJ2hpZGRlbicpXHJcbiAgICBjb25zb2xlLmxvZygobmV3IFNldChhbGxIZWFkZXIpKS51bmlvbih0YWJsZS5oaWRkZW5Db2x1bW5zKSk7XHJcbiAgICAoKG5ldyBTZXQoYWxsSGVhZGVyKSkudW5pb24odGFibGUuaGlkZGVuQ29sdW1ucykpLmZvckVhY2goY29sdW1uID0+IHtcclxuICAgICAgbWVudS5hcHBlbmQoY3JlYXRlQ29sdW1uQ2hvb3Nlck1lbnVJdGVtcyh0YWJsZSwgY29sdW1uKSk7XHJcbiAgICB9KVxyXG4gICAgbWVudUNvbnRhaW5lci5hcHBlbmQobWVudSlcclxuICAgIC8vIHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJNZW51Q29udGFpbmVyID0gbWVudUNvbnRhaW5lcjtcclxuICAgIHJldHVybiBtZW51Q29udGFpbmVyO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gb25Db2x1bW5DaG9vc2VyQnV0dG9uSGFuZGxlcih0YWJsZSwgZXZlbnQpe1xyXG4gICAgbGV0IG9mZnNldCA9IHRhYmxlLm9mZnNldExlZnQ7XHJcblxyXG4gICAgaWYodGFibGUuZWxlbWVudHMudG90YWxfcm93cyl7XHJcbiAgICAgIG9mZnNldCArPSB0YWJsZS5lbGVtZW50cy50b3RhbF9yb3dzLm9mZnNldFdpZHRoO1xyXG4gICAgfVxyXG4gICAgaWYodGFibGUuZWxlbWVudHMuZmlsdGVyZWRfcm93X2NvdW50KXtcclxuICAgICAgb2Zmc2V0ICs9IHRhYmxlLmVsZW1lbnRzLmZpbHRlcmVkX3Jvd19jb3VudC5vZmZzZXRXaWR0aDtcclxuICAgIH1cclxuXHJcbiAgICB0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyTWVudUNvbnRhaW5lci5zdHlsZS5sZWZ0ID0gYCR7b2Zmc2V0fXB4YDtcclxuXHJcbiAgICBsZXQgY2xhc3NMaXN0ID0gdGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3Nlck1lbnVDb250YWluZXIuY2xhc3NMaXN0O1xyXG4gICAgaWYoY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSl7XHJcbiAgICAgIGNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xyXG4gICAgICB0YWJsZS5yb290X2RvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYm91bmRDb2x1bW5DaG9vc2VyT3V0c2lkZUhhbmRsZXIpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjbGFzc0xpc3QuYWRkKCdoaWRkZW4nKVxyXG4gICAgICB0YWJsZS5yb290X2RvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYm91bmRDb2x1bW5DaG9vc2VyT3V0c2lkZUhhbmRsZXIpXHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gb25Db2x1bW5DaG9vc2VyT3V0c2lkZUhhbmRsZXIodGFibGUsIGV2ZW50KXtcclxuICAgIGlmKCFldmVudC5zcmNFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnY29sdW1uLWNob29zZXInKSl7XHJcbiAgICAgIGlmKCFldmVudC5zcmNFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnZm9vdGVyLWJ1dHRvbicpKXtcclxuICAgICAgICBsZXQgY2xhc3NMaXN0ID0gdGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3Nlck1lbnVDb250YWluZXIuY2xhc3NMaXN0O1xyXG4gICAgICAgIGNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xyXG4gICAgICAgIHRhYmxlLnJvb3RfZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBib3VuZENvbHVtbkNob29zZXJPdXRzaWRlSGFuZGxlcilcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gb25Db2x1bW5DaG9vc2VyQ2hhbmdlQ29sdW1uSGFuZGxlcih0YWJsZSwgY29sdW1uLCBldmVudCl7XHJcbiAgICBpZihldmVudC5zcmNFbGVtZW50LmNoZWNrZWQpe1xyXG4gICAgICB0YWJsZS5oaWRkZW5Db2x1bW5zID0gdGFibGUuaGlkZGVuQ29sdW1ucy5maWx0ZXIoZW50cnkgPT4gZW50cnkgIT0gY29sdW1uKTtcclxuICAgICAgdGFibGUudmlzaWJsZUNvbHVtbnMucHVzaChjb2x1bW4pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGFibGUuaGlkZGVuQ29sdW1ucy5wdXNoKGNvbHVtbik7XHJcbiAgICAgIHRhYmxlLnZpc2libGVDb2x1bW5zID0gdGFibGUudmlzaWJsZUNvbHVtbnMuZmlsdGVyKGVudHJ5ID0+IGVudHJ5ICE9PSBjb2x1bW4pO1xyXG4gICAgfVxyXG4gICAgdGFibGUuc2VyaWFsaXplTGlua09wdGlvbnMoKTtcclxuICAgIHRhYmxlLnJlZHJhd1RhYmxlKCk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmaWxsRGF0YSh0YWJsZSwgZGF0YSl7XHJcbiAgICB0YWJsZS5lbGVtZW50cy5kYXRhQ2VsbHMgPSB7fTtcclxuICAgIGRhdGEuZm9yRWFjaCgocm93LCByb3dJbmRleCkgPT4ge1xyXG4gICAgICB0YWJsZS5oZWFkZXIuZm9yRWFjaCggKGNvbHVtbiwgY29sdW1uSW5kZXgpID0+IHtcclxuICAgICAgICBsZXQgY2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgIGNlbGwuY2xhc3NMaXN0LmFkZCgnd2d0LWNlbGwnLCAnd2d0LWRhdGEtY2VsbCcsIGB3Z3QtY29sdW1uXyR7Y29sdW1uLnNwbGl0KCcgJykuam9pbignXycpfWAsIGB3Z3Qtcm93XyR7cm93SW5kZXh9YCwgYHdndC16ZWJyYV8ke3Jvd0luZGV4ICUgMn1gKVxyXG4gICAgICAgIC8vIGNlbGwuY2xhc3NMaXN0LmFkZCgpXHJcbiAgICAgICAgLy8gY2VsbC5jbGFzc0xpc3QuYWRkKClcclxuICAgICAgICBjZWxsLmlubmVySFRNTCA9IHJvd1tjb2x1bW5dICE9IHVuZGVmaW5lZCA/IHJvd1tjb2x1bW5dIDogJyc7XHJcbiAgICAgICAgLy8gaWYoY29sdW1uID09PSAnI2luY2x1ZGUnKSB7XHJcbiAgICAgICAgLy8gICBjZWxsLnNldEF0dHJpYnV0ZSgnY29udGVudEVkaXRhYmxlJywgJ3RydWUnKTtcclxuICAgICAgICAvLyAgIGxldCB0ZW1wUm93QWN0aXZlID0gey4uLnJvd307XHJcbiAgICAgICAgLy8gICBkZWxldGUgdGVtcFJvd0FjdGl2ZVsnI2luY2x1ZGUnXTtcclxuICAgICAgICAvLyAgIC8vIGNvbnNvbGUubG9nKHRhYmxlLnRpY2tlZFJvd3MpO1xyXG4gICAgICAgIC8vICAgLy8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodGVtcFJvd0FjdGl2ZSkpO1xyXG4gICAgICAgIC8vICAgLy8gY29uc29sZS5sb2codGFibGUudGlja2VkUm93cy5pbmNsdWRlcyhKU09OLnN0cmluZ2lmeSh0ZW1wUm93QWN0aXZlKSkpO1xyXG4gICAgICAgIC8vICAgY2VsbC5pbm5lclRleHQgPSB0YWJsZS50aWNrZWRSb3dzLmluY2x1ZGVzKEpTT04uc3RyaW5naWZ5KHRlbXBSb3dBY3RpdmUpKSA/ICd4JyA6ICcnO1xyXG4gICAgICAgIC8vICAgY2VsbC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIChldmVudCkgPT4geyAgICAgICBcclxuICAgICAgICAvLyAgICAgLy8gY29uc29sZS5sb2coJ2lucHV0IGNoYW5nZWQgaW4gcm93ICcgKyByb3dJbmRleCk7ICAgICBcclxuICAgICAgICAvLyAgICAgLy8gY29uc29sZS5sb2coZXZlbnQudGFyZ2V0LmlubmVyVGV4dCk7XHJcbiAgICAgICAgLy8gICAgIGxldCB0ZW1wUm93ID0gey4uLnJvd307XHJcbiAgICAgICAgLy8gICAgIGRlbGV0ZSB0ZW1wUm93WycjaW5jbHVkZSddO1xyXG4gICAgICAgIC8vICAgICBpZihldmVudC50YXJnZXQuaW5uZXJUZXh0KXtcclxuICAgICAgICAvLyAgICAgICAvLyBjb25zb2xlLmxvZygnYWRkZWQgcm93Jyk7XHJcbiAgICAgICAgLy8gICAgICAgdGFibGUudGlja2VkUm93cy5wdXNoKCBKU09OLnN0cmluZ2lmeSh0ZW1wUm93KSk7XHJcbiAgICAgICAgLy8gICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gICAgICAgLy8gY29uc29sZS5sb2coJ3JlbW92ZWQgcm93Jyk7XHJcbiAgICAgICAgLy8gICAgICAgdGFibGUudGlja2VkUm93cyA9IHRhYmxlLnRpY2tlZFJvd3MuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gSlNPTi5zdHJpbmdpZnkodGVtcFJvdykpKTtcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vICAgICB0YWJsZS5zZXJpYWxpemVMaW5rT3B0aW9ucygpO1xyXG4gICAgICAgIC8vICAgfSk7XHJcbiAgICAgICAgLy8gfVxyXG4gICAgICAgIGlmKCF0YWJsZS5lbGVtZW50cy5kYXRhQ2VsbHNbY29sdW1uXSkgdGFibGUuZWxlbWVudHMuZGF0YUNlbGxzW2NvbHVtbl0gPSBbXTtcclxuICAgICAgICB0YWJsZS5lbGVtZW50cy5kYXRhQ2VsbHNbY29sdW1uXS5wdXNoKGNlbGwpO1xyXG4gICAgICAgIHRhYmxlLmFwcGVuZChjZWxsKVxyXG4gICAgICB9KVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlYWQgdGhlIGNvbHVtbiBuYW1lcyAoaGVhZGVyKSBmcm9tIHRoZSBkYXRhLCBpZiB0aGV5IGFyZSBub3Qgc3VwcGx5ZWQuIFxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB7QXJyYXk8T2JqZWN0Pn0gZGF0YSBcclxuICAgKiBAcmV0dXJucyB7QXJyYXk8c3RyaW5nPn0gdGhlIGxpc3Qgb2YgY29sdW1uIG5hbWVzLlxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGdlbmVyYXRlSGVhZGVyKGRhdGEpe1xyXG4gICAgcmV0dXJuIGRhdGEubWFwKE9iamVjdC5rZXlzKS5yZWR1Y2UoKGNvbCwgY3VyKSA9PiB7XHJcbiAgICAgIGxldCByZXN1bHQgPSBjb2w7XHJcbiAgICAgIGN1ci5mb3JFYWNoKHZhbHVlID0+IHtcclxuICAgICAgICBpZighY29sLmluY2x1ZGVzKHZhbHVlKSkgcmVzdWx0LnB1c2godmFsdWUpXHJcbiAgICAgIH0pXHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9LCBbXSlcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGx5Q29uZGl0aW9uYWxDb2x1bW5TdHlsaW5nKHRhYmxlLCBkYXRhLCBoZWFkZXIsIGNvbmRpdGlvbmFsQ29sdW1uU3R5bGUsIG9wdGlvbnMpe1xyXG4gICAgaWYob3B0aW9ucy5hY3RpdmUpe1xyXG4gICAgICBsZXQgY29sdW1uX3N0eWxlX2VsZW1lbnQgPSB0YWJsZS5lbGVtZW50cy5jb2x1bW5TdHlsZTtcclxuICAgICAgaWYoIWNvbHVtbl9zdHlsZV9lbGVtZW50KXtcclxuICAgICAgICB0YWJsZS5lbGVtZW50cy5jb2x1bW5TdHlsZSA9IGNvbHVtbl9zdHlsZV9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuICAgICAgICBjb2x1bW5fc3R5bGVfZWxlbWVudC50eXBlID0gXCJ0ZXh0L2Nzc1wiO1xyXG4gICAgICAgIGNvbHVtbl9zdHlsZV9lbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2NvbHVtbl9zdHlsZXMnKTtcclxuICAgICAgICB0YWJsZS5yb290X2RvY3VtZW50LmhlYWQuYXBwZW5kKGNvbHVtbl9zdHlsZV9lbGVtZW50KTtcclxuICAgICAgfVxyXG4gICAgICBjb2x1bW5fc3R5bGVfZWxlbWVudC5pbm5lckhUTUwgPSAnJztcclxuICAgICAgaGVhZGVyLmZvckVhY2goY29sdW1uID0+IHtcclxuICAgICAgICBjb25kaXRpb25hbENvbHVtblN0eWxlLmZvckVhY2goKGNvbmRpdGlvbmFsU3R5bGUpID0+IHtcclxuICAgICAgICAgIGlmKGNvbmRpdGlvbmFsU3R5bGUuY29uZGl0aW9uKGRhdGEsIGNvbHVtbikpe1xyXG4gICAgICAgICAgICBjb2x1bW5fc3R5bGVfZWxlbWVudC5pbm5lckhUTUwgKz0gYFxyXG4gICAgICAgICAgICAgIGRpdi53Z3QtY29sdW1uXyR7Y29sdW1ufS53Z3QtZGF0YS1jZWxsIHtcclxuICAgICAgICAgICAgICAgICR7Y29uZGl0aW9uYWxTdHlsZS5zdHlsZXMuam9pbignXFxuJyl9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBgXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfSlcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGx5Q29uZGl0aW9uYWxSb3dTdHlsaW5nKHRhYmxlLCBkYXRhLCBoZWFkZXIsIGNvbmRpdGlvbmFsUm93U3R5bGUsIG9wdGlvbnMpe1xyXG4gICAgaWYob3B0aW9ucy5hY3RpdmUpe1xyXG4gICAgICBsZXQgcm93X3N0eWxlX2VsZW1lbnQgPSB0YWJsZS5lbGVtZW50cy5jb2x1bW5TdHlsZTtcclxuICAgICAgaWYoIXJvd19zdHlsZV9lbGVtZW50KXtcclxuICAgICAgICB0YWJsZS5lbGVtZW50cy5jb2x1bW5TdHlsZSA9IHJvd19zdHlsZV9lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuICAgICAgICByb3dfc3R5bGVfZWxlbWVudC50eXBlID0gXCJ0ZXh0L2Nzc1wiO1xyXG4gICAgICAgIHJvd19zdHlsZV9lbGVtZW50LmNsYXNzTGlzdC5hZGQoJ3Jvd19zdHlsZXMnKTtcclxuICAgICAgICB0YWJsZS5yb290X2RvY3VtZW50LmhlYWQuYXBwZW5kKHJvd19zdHlsZV9lbGVtZW50KTtcclxuICAgICAgfVxyXG4gICAgICByb3dfc3R5bGVfZWxlbWVudC5pbm5lckhUTUwgPSAnJztcclxuICAgICAgT2JqZWN0LmtleXMoY29uZGl0aW9uYWxSb3dTdHlsZSkuZm9yRWFjaChjb2x1bW4gPT4ge1xyXG4gICAgICAgIGRhdGEuZm9yRWFjaCgocm93LCByb3dfaW5kZXgpID0+IHtcclxuICAgICAgICAgIGNvbmRpdGlvbmFsUm93U3R5bGVbY29sdW1uXS5mb3JFYWNoKGNvbmRpdGlvbmFsU3R5bGUgPT4ge1xyXG4gICAgICAgICAgICBpZihjb25kaXRpb25hbFN0eWxlLmNvbmRpdGlvbihyb3dbY29sdW1uXSwgcm93X2luZGV4KSl7XHJcbiAgICAgICAgICAgICAgcm93X3N0eWxlX2VsZW1lbnQuaW5uZXJIVE1MICs9IGBkaXYke2NvbmRpdGlvbmFsU3R5bGUuZnVsbHJvdyA/ICcnIDogYC53Z3QtY29sdW1uXyR7Y29sdW1ufWB9LndndC1yb3dfJHtyb3dfaW5kZXh9IHtcXG5gXHJcbiAgICAgICAgICAgICAgcm93X3N0eWxlX2VsZW1lbnQuaW5uZXJIVE1MICs9IGNvbmRpdGlvbmFsU3R5bGUuc3R5bGVzLmpvaW4oJ1xcbicpXHJcbiAgICAgICAgICAgICAgcm93X3N0eWxlX2VsZW1lbnQuaW5uZXJIVE1MICs9ICdcXG59J1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH0pIFxyXG4gICAgICB9KVxyXG4gICAgICAvLyB0YWJsZS5yb290X2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2hlYWQnKS5hcHBlbmQocm93X3N0eWxlX2VsZW1lbnQpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZXNldFNvcnRpbmcodGFibGUpe1xyXG4gICAgdGFibGUuc29ydGVkRGF0YSA9IHRhYmxlLmRhdGEgPyB0YWJsZS5kYXRhLm1hcCh2YWx1ZSA9PiB2YWx1ZSkgOiBbXTtcclxuICAgIHRhYmxlLnNvcnRlZEJ5ID0gW107XHJcbiAgICBpZih0YWJsZS5oZWFkZXIpIHRhYmxlLmhlYWRlci5mb3JFYWNoKGNvbHVtbiA9PiB7XHJcbiAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5pbm5lckhUTUwgPSAnJiM4NjkzOyc7XHJcbiAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5hcnJvd0FscGhhQ29sb3IgPSAxLjA7XHJcbiAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5zdHlsZS5jb2xvciA9IGBsaWdodGdyYXlgO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZXNldEZpbHRlck9wZXJhdGlvbnModGFibGUpe1xyXG4gICAgdGFibGUuaGVhZGVyLmZvckVhY2goY29sdW1uID0+IHtcclxuICAgICAgbGV0IG9wZXJhdGlvbiA9IHRhYmxlLmZpbHRlck9wZXJhdGlvbnMuZmluZChvcCA9PiAob3AubmFtZSA9PSB0YWJsZS5hY3RpdmVGaWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0pKTtcclxuICAgICAgaWYob3BlcmF0aW9uKSB0YWJsZS5lbGVtZW50cy5maWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0uaW5uZXJIVE1MID0gb3BlcmF0aW9uLmNoYXI7XHJcbiAgICB9KTsgICAgXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTb3J0cyB0aGUgZGF0YSwgYmUgdGhlIHNwY2lmaWVkIHNvcnRpbmcgKHRhYmxlLnNvcnRlZEJ5KS5cclxuICAgKiBAcGFyYW0ge1RhYmxlQ29tcG9uZW50fSB0YWJsZSByZWZlcmVuY2UgdG8gVGFibGVDb21wb25lbnRcclxuICAgKiBAcmV0dXJucyB7T2JqZWN0W119IHNvcnRlZCBkYXRhXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gYXBwbHlTb3J0aW5nKHRhYmxlKXtcclxuICAgIC8vIGlmKGNvbHVtbikge1xyXG4gICAgLy8gICByZXR1cm4gdGFibGUuc29ydGVkRGF0YS5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAvLyAgICAgcmV0dXJuIHRhYmxlLmN1c3RvbUNob29zZVNvcnRzQ29tcGFyZUZuKHRhYmxlLCB0YWJsZS5zb3J0ZWREYXRhLCBjb2x1bW4pKGFbY29sdW1uXSwgYltjb2x1bW5dKVxyXG4gICAgLy8gICB9KVxyXG4gICAgLy8gfSBlbHNlIFxyXG4gICAgaWYodGFibGUuc29ydGVkQnkgJiYgdGFibGUuc29ydGVkQnkubGVuZ3RoID4gMCkge1xyXG4gICAgICBjb2x1bW4gPSB0YWJsZS5zb3J0ZWRCeVswXS5jb2w7XHJcbiAgICAgIGxldCBzb3J0ZWQgPSB0YWJsZS5zb3J0ZWREYXRhLnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgICByZXR1cm4gdGFibGUuY3VzdG9tQ2hvb3NlU29ydHNDb21wYXJlRm4odGFibGUsIHRhYmxlLmRhdGEsIGNvbHVtbikoYVtjb2x1bW5dLCBiW2NvbHVtbl0pXHJcbiAgICAgIH0pXHJcbiAgICAgIGlmKHRhYmxlLnNvcnRlZEJ5WzBdLmRpciA9PT0gJ2Rlc2MnKVxyXG4gICAgICAgIHNvcnRlZCA9IFtdLmNvbmNhdChzb3J0ZWQuZmlsdGVyKGVudHJ5ID0+IGVudHJ5W2NvbHVtbl0gIT0gdW5kZWZpbmVkICYmIGVudHJ5W2NvbHVtbl0gIT09ICcnKS5yZXZlcnNlKCksIHNvcnRlZC5maWx0ZXIoZW50cnkgPT4gZW50cnlbY29sdW1uXSA9PSB1bmRlZmluZWQgfHwgZW50cnlbY29sdW1uXSA9PT0gJycpKTtcclxuICAgICAgcmV0dXJuIHNvcnRlZDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiB0YWJsZS5zb3J0ZWREYXRhO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwbHlGaWx0ZXIodGFibGUsIGRhdGEsIGhlYWRlciwgZmlsdGVyLCBvcHRpb25zKXtcclxuICAgIGlmKG9wdGlvbnMuYWN0aXZlKXtcclxuICAgICAgcmV0dXJuIGRhdGEuZmlsdGVyKHJvdyA9PiBcclxuICAgICAgICBoZWFkZXIubWFwKGNvbHVtbiA9PiB7XHJcbiAgICAgICAgICBpZihmaWx0ZXJbY29sdW1uXSl7XHJcbiAgICAgICAgICAgIGlmICh0YWJsZS5hY3RpdmVGaWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0gPT0gJycgfHwgdGFibGUuYWN0aXZlRmlsdGVyT3BlcmF0aW9uc1tjb2x1bW5dID09IHVuZGVmaW5lZCkgdGFibGUuYWN0aXZlRmlsdGVyT3BlcmF0aW9uc1tjb2x1bW5dID0gdGFibGUuZmlsdGVyT3BlcmF0aW9uc1swXS5uYW1lO1xyXG4gICAgICAgICAgICByZXR1cm4gdGFibGUuZmlsdGVyT3BlcmF0aW9ucy5maW5kKG9wID0+IChvcC5uYW1lID09IHRhYmxlLmFjdGl2ZUZpbHRlck9wZXJhdGlvbnNbY29sdW1uXSkpLmZuKGZpbHRlcltjb2x1bW5dLCByb3dbY29sdW1uXSk7XHJcbiAgICAgICAgICB9IGVsc2UgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSkucmVkdWNlKChjb2wsIGN1cikgPT4gKGNvbCAmJiBjdXIpLCB0cnVlKVxyXG4gICAgICApXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZGF0YTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGx5Rm9ybWF0dGVyKGRhdGEsIGhlYWRlciwgZm9ybWF0dGVyLCBvcHRpb25zKXtcclxuICAgIGlmKG9wdGlvbnMuYWN0aXZlKXtcclxuICAgICAgLy8gY29uc29sZS5sb2coaGVhZGVyKTtcclxuICAgICAgcmV0dXJuIGRhdGEubWFwKChyb3csIHJvd05yLCBkYXRhUmVhZE9ubHkpID0+IHtcclxuICAgICAgICBsZXQgZm9ybWF0dGVkUm93ID0gcm93OyBcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhoZWFkZXIpO1xyXG4gICAgICAgIGhlYWRlci5mb3JFYWNoKGNvbHVtbiA9PiB7XHJcbiAgICAgICAgICAvLyBpZihjb2x1bW4gPT09ICcjaW5jbHVkZScgJiYgcm93TnIgPT09IDApe1xyXG4gICAgICAgICAgLy8gICBjb25zb2xlLmxvZygnaW5jbHVkZSAwJywgcm93LCByb3dbY29sdW1uXSwgZm9ybWF0dGVyW2NvbHVtbl0pO1xyXG4gICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgIGlmKGZvcm1hdHRlcltjb2x1bW5dKXtcclxuICAgICAgICAgICAgZm9ybWF0dGVkUm93W2NvbHVtbl0gPSBmb3JtYXR0ZXJbY29sdW1uXS5yZWR1Y2UoKGNvbCwgY3VyKSA9PiBjdXIoY29sLCByb3dOciwgZGF0YVJlYWRPbmx5KSwgcm93W2NvbHVtbl0pLy8udG9TdHJpbmcoKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGZvcm1hdHRlZFJvd1tjb2x1bW5dID0gcm93W2NvbHVtbl1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBpZihjb2x1bW4gPT09ICcjaW5jbHVkZScgJiYgcm93TnIgPT09IDApe1xyXG4gICAgICAgICAgLy8gICBjb25zb2xlLmxvZygnaW5jbHVkZSAwJywgZm9ybWF0dGVkUm93KTtcclxuICAgICAgICAgIC8vIH1cclxuICAgICAgICB9KVxyXG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWRSb3c7XHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBhcHBseVBhZ2luYXRpb24odGFibGUsIGRhdGEpe1xyXG4gICAgbGV0IHJlc3VsdCA9IGRhdGE7XHJcbiAgICB0YWJsZS5wYWdpbmF0aW9uLmFjdGl2ZSA9IHRhYmxlLnBhZ2luYXRpb25PcHRpb25zLmFjdGl2ZTtcclxuICAgIHRhYmxlLnBhZ2luYXRpb24udG90YWxQYWdlcyA9IHRhYmxlLnBhZ2luYXRpb24uYWN0aXZlID8gTWF0aC5jZWlsKGRhdGEubGVuZ3RoIC8gdGFibGUucGFnaW5hdGlvbi5wYWdlU2l6ZSkgOiAxO1xyXG4gICAgaWYodGFibGUucGFnaW5hdGlvbi50b3RhbFBhZ2VzID09IDEpe1xyXG4gICAgICB0YWJsZS5wYWdpbmF0aW9uLmFjdGl2ZSA9IGZhbHNlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmVzdWx0ID0gZGF0YS5maWx0ZXIoKHZhbHVlLCBpbmRleCkgPT4gXHJcbiAgICAgICAgIXRhYmxlLnBhZ2luYXRpb24uYWN0aXZlXHJcbiAgICAgICAgfHwgKChpbmRleCA+PSAodGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSAtIDEpICogdGFibGUucGFnaW5hdGlvbi5wYWdlU2l6ZSkgXHJcbiAgICAgICAgJiYgKGluZGV4IDwgKHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UpICogdGFibGUucGFnaW5hdGlvbi5wYWdlU2l6ZSkpXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZHJhd1RhYmxlKHRhYmxlKXtcclxuICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3MgPSB7fTtcclxuXHJcbiAgICAvLyB0YWJsZS5kYXRhID0gdGFibGUuZGF0YS5tYXAoZW50cnkgPT4ge1xyXG4gICAgLy8gICBsZXQgdGVtcFJvdyA9IGVudHJ5O1xyXG4gICAgLy8gICBkZWxldGUgdGVtcFJvd1snI2luY2x1ZGUnXTtcclxuICAgIC8vICAgcmV0dXJuIHsnI2luY2x1ZGUnOiB0YWJsZS5vcHRpb25zLnRpY2tlZFJvd3MuaW5jbHVkZXMoSlNPTi5zdHJpbmdpZnkodGVtcFJvdykpID8gJ3gnIDogJycsIC4uLnRlbXBSb3d9O1xyXG4gICAgLy8gfSk7XHJcbiAgICBcclxuXHJcbiAgICB0YWJsZS5kcmF3T3B0aW9uYWxzID0ge1xyXG4gICAgICBoZWFkZXI6ICF0YWJsZS5oYXNBdHRyaWJ1dGUoJ25vaGVhZGVyJyksXHJcbiAgICAgIGZpbHRlcjogIXRhYmxlLmhhc0F0dHJpYnV0ZSgnbm9maWx0ZXInKSwgLy8hIFRPRE8gZml4IEJyb2tlbiBub2ZpbHRlclxyXG4gICAgICBmb290ZXI6ICF0YWJsZS5oYXNBdHRyaWJ1dGUoJ25vZm9vdGVyJyksXHJcbiAgICAgIHBhZ2VrZXk6ICF0YWJsZS5oYXNBdHRyaWJ1dGUoJ25vcGFnZWtleScpLFxyXG4gICAgICByZXdyaXRldXJsOiAhdGFibGUuaGFzQXR0cmlidXRlKCdub3Jld3JpdGV1cmwnKSxcclxuICAgIH1cclxuICAgIFxyXG4gICAgdGFibGUuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgIGlmKCF0YWJsZS5kYXRhKSB0YWJsZS5kYXRhID0gW107ICAgICAgXHJcbiAgICBpZighdGFibGUuc29ydGVkRGF0YSkgdGFibGUuc29ydGVkRGF0YSA9IHRhYmxlLmRhdGEubWFwKHZhbHVlID0+IHZhbHVlKTtcclxuXHJcbiAgICBpZighdGFibGUuaGVhZGVyQWxsICYmIHRhYmxlLmRhdGEubGVuZ3RoID4gMCl7XHJcbiAgICAgIGxldCBnZW5IZWFkZXIgPSBnZW5lcmF0ZUhlYWRlcih0YWJsZS5kYXRhKTtcclxuICAgICAgY29uc29sZS5sb2coJ2dlbmhlYWRlcicsIGdlbkhlYWRlcik7XHJcbiAgICAgIC8vIGlmKCFnZW5IZWFkZXIuaW5jbHVkZXMoJyNpbmNsdWRlJykpIHRhYmxlLmhlYWRlckFsbCA9IFsnI2luY2x1ZGUnXS5jb25jYXQoZ2VuSGVhZGVyKTtcclxuICAgICAgdGFibGUuaGVhZGVyQWxsID0gZ2VuSGVhZGVyO1xyXG5cclxuICAgICAgXHJcbiAgICAgIHRhYmxlLmhpZGRlbkNvbHVtbnMgPSB0YWJsZS5oaWRkZW5Db2x1bW5zLmNvbmNhdCh0YWJsZS5oZWFkZXJBbGwuZmlsdGVyKGNvbHVtbiA9PlxyXG4gICAgICAgIHRhYmxlLmhpZGRlbkNvbHVtbnNDb25kaXRpb25cclxuICAgICAgICAgIC5tYXAoY29uZGl0aW9uID0+ICh7Y29sOiBjb2x1bW4sIGhpZGRlbjogY29uZGl0aW9uKGNvbHVtbiwgdGFibGUuZGF0YSl9KSlcclxuICAgICAgICAgIC5maWx0ZXIoY29sdW1uQ29uZCA9PiBjb2x1bW5Db25kLmhpZGRlbilcclxuICAgICAgICAgIC5tYXAoY29sdW1uQ29uZCA9PiBjb2x1bW5Db25kLmNvbClcclxuICAgICAgICAgIC5pbmNsdWRlcyhjb2x1bW4pXHJcbiAgICAgICkpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKHRhYmxlLmhlYWRlckFsbCAmJiB0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyQ2hlY2tib3gpIHtcclxuICAgICAgZm9yKGxldCBjb2x1bW4gb2YgdGFibGUuaGVhZGVyQWxsKXtcclxuICAgICAgICBpZih0YWJsZS5oaWRkZW5Db2x1bW5zLmluY2x1ZGVzKGNvbHVtbikgJiYgIXRhYmxlLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKGNvbHVtbikpe1xyXG4gICAgICAgICAgdGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3NlckNoZWNrYm94W2NvbHVtbl0uY2hlY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyQ2hlY2tib3hbY29sdW1uXS5jaGVja2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZygnaGlkZGVuIGNvbHVtbnMnLCB0YWJsZS5oaWRkZW5Db2x1bW5zKTtcclxuXHJcbiAgICBpZih0YWJsZS5oZWFkZXJBbGwpe1xyXG4gICAgICB0YWJsZS5oZWFkZXIgPSBcclxuICAgICAgICB0YWJsZS5oZWFkZXJBbGwuZmlsdGVyKGNvbHVtbiA9PiBcclxuICAgICAgICAgICF0YWJsZS5oaWRkZW5Db2x1bW5zLmluY2x1ZGVzKGNvbHVtbikgfHwgdGFibGUudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoY29sdW1uKVxyXG4gICAgICAgIClcclxuICAgICAgdGFibGUuc3R5bGUuZ3JpZFRlbXBsYXRlQ29sdW1ucyA9IGByZXBlYXQoJHt0YWJsZS5oZWFkZXIubGVuZ3RofSwgbWF4LWNvbnRlbnQpYDtcclxuICAgIH1cclxuXHJcbiAgICBpZih0YWJsZS5kcmF3T3B0aW9uYWxzLmhlYWRlciAmJiB0YWJsZS5oZWFkZXIpe1xyXG4gICAgICBjcmVhdGVIZWFkZXIodGFibGUpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZih0YWJsZS5kcmF3T3B0aW9uYWxzLmZpbHRlciAmJiB0YWJsZS5oZWFkZXIpe1xyXG4gICAgICBjcmVhdGVGaWx0ZXIodGFibGUsIHRhYmxlLmhlYWRlciwgdGFibGUuZmlsdGVyKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGFibGUuZGF0YS5sZW5ndGggPiAwKXtcclxuICAgICAgLy8gdGFibGUuZGF0YSA9IHRhYmxlLmRhdGE7XHJcbiAgICAgIHRhYmxlLmRpc3BsYXllZERhdGEgPSBkcmF3RGF0YSh0YWJsZSk7XHJcblxyXG4gICAgICAvLz8gTG9nLCB0aGF0IGlzIHNlbmQgdG8gVHJhY2tlciBTZXJ2ZXI6XHJcbiAgICAgIGNvbnNvbGUubG9nKCdGaW5pc2hlZCB0cmFuc2Zvcm0gb2YgZGF0YS4nLCB0YWJsZS5kaXNwbGF5ZWREYXRhLCBhcHBuYW1lKTtcclxuXHJcbiAgICAgIHRhYmxlLmVsZW1lbnRzLnBhZ2VDaG9vc2VyID0gY3JlYXRlUGFnZUNob29zZXIodGFibGUsIHRhYmxlLmRpc3BsYXllZERhdGEpO1xyXG5cclxuICAgICAgaWYgKHRhYmxlLmRyYXdPcHRpb25hbHMuZm9vdGVyKSBjcmVhdGVGb290ZXIodGFibGUsIHRhYmxlLmRpc3BsYXllZERhdGEsIHRhYmxlLmVsZW1lbnRzLnBhZ2VDaG9vc2VyKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGFibGUuZHJhd09wdGlvbmFscy5wYWdla2V5KXtcclxuICAgICAgYWRkS2V5SGFuZGxlclRvRG9jdW1lbnQodGFibGUpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZHJhd0RhdGEodGFibGUpe1xyXG4gICAgdGFibGUuc29ydGVkRGF0YSA9IGFwcGx5U29ydGluZyh0YWJsZSk7XHJcbiAgICBhcHBseUNvbmRpdGlvbmFsQ29sdW1uU3R5bGluZyh0YWJsZSwgdGFibGUuc29ydGVkRGF0YSwgdGFibGUuaGVhZGVyLCB0YWJsZS5jb25kaXRpb25hbENvbHVtblN0eWxlLCB0YWJsZS5jb25kaXRpb25hbFN0eWxlT3B0aW9ucyk7XHJcbiAgICBjb25zb2xlLmxvZygnc29ydGVkIGRhdGEnLCB0YWJsZS5zb3J0ZWREYXRhKTtcclxuICAgIGNvbnNvbGUubG9nKCdoZWFkZXInLCB0YWJsZS5oZWFkZXIpO1xyXG4gICAgbGV0IGZvcm1hdHRlZERhdGEgPSBhcHBseUZvcm1hdHRlcih0YWJsZS5zb3J0ZWREYXRhLCB0YWJsZS5oZWFkZXIsIHRhYmxlLmZvcm1hdHRlciwgdGFibGUuZm9ybWF0dGVyT3B0aW9ucyk7XHJcbiAgICBjb25zb2xlLmxvZygnZm9ybWF0dGVkIGRhdGEnLCBmb3JtYXR0ZWREYXRhKTtcclxuICAgIGxldCBmaWx0ZXJlZERhdGEgPSBhcHBseUZpbHRlcih0YWJsZSwgZm9ybWF0dGVkRGF0YSwgdGFibGUuaGVhZGVyLCB0YWJsZS5maWx0ZXIsIHRhYmxlLmZpbHRlck9wdGlvbnMpO1xyXG4gICAgY29uc29sZS5sb2coJ2ZpbHRlcmVkIGRhdGEnLCBmaWx0ZXJlZERhdGEpO1xyXG4gICAgdGFibGUucGFnaW5hdGlvbi5maWx0ZXJlZERhdGFDb3VudCA9IGZpbHRlcmVkRGF0YS5sZW5ndGg7XHJcbiAgICBsZXQgcGFnZWluYXRlZERhdGEgPSBhcHBseVBhZ2luYXRpb24odGFibGUsIGZpbHRlcmVkRGF0YSk7XHJcbiAgICBjb25zb2xlLmxvZygncGFnaW5hdGVkIGRhdGEnLCBwYWdlaW5hdGVkRGF0YSk7XHJcbiAgICAvLyBwYWdlaW5hdGVkRGF0YSA9IHBhZ2VpbmF0ZWREYXRhLm1hcChlbnRyeSA9PiAoeycjaW5jbHVkZSc6IHRhYmxlLnRpY2tlZFJvd3MuaW5jbHVkZXMoSlNPTi5zdHJpbmdpZnkoZW50cnkpKSA/ICd4JyA6ICcnLCAuLi5lbnRyeX0pKVxyXG4gICAgdGFibGUuc3R5bGUuZ3JpZFRlbXBsYXRlUm93cyA9IGAke1xyXG4gICAgICB0YWJsZS5kcmF3T3B0aW9uYWxzLmhlYWRlciA/ICdtYXgtY29udGVudCcgOiAnJ30gJHtcclxuICAgICAgICB0YWJsZS5kcmF3T3B0aW9uYWxzLmZpbHRlciA/ICdtYXgtY29udGVudCcgOiAnJ30gcmVwZWF0KCR7cGFnZWluYXRlZERhdGEubGVuZ3RofSwgbWF4LWNvbnRlbnQpICR7XHJcbiAgICAgICAgICB0YWJsZS5kcmF3T3B0aW9uYWxzLmZvb3RlciA/ICdtYXgtY29udGVudCcgOiAnJ31gOyBcclxuICAgIGZpbGxEYXRhKHRhYmxlLCBwYWdlaW5hdGVkRGF0YSk7XHJcbiAgICBhcHBseUNvbmRpdGlvbmFsUm93U3R5bGluZyh0YWJsZSwgcGFnZWluYXRlZERhdGEsIHRhYmxlLmhlYWRlciwgdGFibGUuY29uZGl0aW9uYWxSb3dTdHlsZSwgdGFibGUuY29uZGl0aW9uYWxTdHlsZU9wdGlvbnMpO1xyXG4gICAgcmV0dXJuIHBhZ2VpbmF0ZWREYXRhO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZGVmaW5lSGlkZGVuUHJvcGVydGllcyh0YWJsZSwgcHJvcHMpe1xyXG4gICAgcHJvcHMuZm9yRWFjaChwcm9wID0+IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YWJsZSwgcHJvcCwge1xyXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICAgIC8vIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIH0pKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZGVmaW5lT3B0aW9uUHJvcGVydGllcyh0YWJsZSwgcHJvcHMpe1xyXG4gICAgcHJvcHMuZm9yRWFjaChwcm9wID0+IFxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFibGUsIHByb3AsIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZnVuUmVnZXggPSAvXigoPzpmdW5jdGlvblxccyouKil7MCwxfVxcKChbXlxcKFxce1xcW1xcPVxcPl0qKVxcKVxccyooPzo9PnxcXHspXFxzKltcXHtcXChdezAsMX0uKltcXH1cXCldezAsMX0pJC9neTtcclxuXHJcbiAgZnVuY3Rpb24gZGVzZXJpYWxpemVGdW5jdGlvbihmdW5TdHIpe1xyXG4gICAgbGV0IG1hdGNoID0gZnVuUmVnZXguZXhlYyhmdW5TdHIpO1xyXG4gICAgbGV0IGFyZ3MgPSBtYXRjaC5ncm91cHNbMl0uc3BsaXQoJywnKS5tYXAoc3RyID0+IHN0ci50cmltKCkpXHJcbiAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKC4uLmFyZ3MsIGByZXR1cm4gKCR7ZnVuU3RyLnRvU3RyaW5nKCl9KSgke2FyZ3Muam9pbignLCAnKX0pYClcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNlcmlhbGl6ZUZ1bmN0aW9uKGZ1bil7XHJcbiAgICByZXR1cm4gZnVuLnRvU3RyaW5nKCk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZXBsYWNlVXJsU2VhcmNoUGFyYW1ldGVyKG5ld1BhcmFtS2V5LCBuZXdQYXJhbVZhbHVlKXtcclxuICAgIGxldCByZXN1bHQgPSAnPyc7XHJcbiAgICBsZXQgcmVwbGFjZWQgPSBmYWxzZTtcclxuICAgIGxldCBvbGRQYXJhbXMgPSBsb2NhdGlvbi5zZWFyY2guc2xpY2UoMSkuc3BsaXQoJyYnKVxyXG4gICAgaWYob2xkUGFyYW1zLmxlbmd0aCA+IDEpe1xyXG4gICAgICBvbGRQYXJhbXMuZm9yRWFjaChvbGRQYXJhbSA9PiB7XHJcbiAgICAgICAgbGV0IG9sZFBhcmFtS2V5ID0gb2xkUGFyYW0uc3BsaXQoJz0nKVswXTtcclxuICAgICAgICBpZihvbGRQYXJhbUtleSA9PSBuZXdQYXJhbUtleSkge1xyXG4gICAgICAgICAgcmVwbGFjZWQgPSB0cnVlO1xyXG4gICAgICAgICAgcmVzdWx0ICs9IGAke29sZFBhcmFtS2V5fT0ke25ld1BhcmFtVmFsdWV9JmA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgcmVzdWx0ICs9IGAke29sZFBhcmFtS2V5fT0ke29sZFBhcmFtLnNwbGl0KCc9Jykuc2xpY2UoMSkuam9pbignPScpfSZgO1xyXG4gICAgICB9KVxyXG4gICAgfSBlbHNlIGlmKG9sZFBhcmFtcy5sZW5ndGggPT0gMSl7XHJcbiAgICAgIGlmIChvbGRQYXJhbXNbMF0gPT0gXCJcIil7XHJcbiAgICAgICAgcmVwbGFjZWQgPSB0cnVlO1xyXG4gICAgICAgIHJlc3VsdCArPSBgJHtuZXdQYXJhbUtleX09JHtuZXdQYXJhbVZhbHVlfSZgO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChvbGRQYXJhbXNbMF0uc3BsaXQoJz0nKVswXSA9PSBuZXdQYXJhbUtleSl7XHJcbiAgICAgICAgICByZXBsYWNlZCA9IHRydWU7XHJcbiAgICAgICAgICByZXN1bHQgKz0gYCR7bmV3UGFyYW1LZXl9PSR7bmV3UGFyYW1WYWx1ZX0mYDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmVzdWx0ICs9IGAke29sZFBhcmFtc1swXS5zcGxpdCgnPScpWzBdfT0ke29sZFBhcmFtc1swXS5zcGxpdCgnPScpLnNsaWNlKDEpLmpvaW4oJz0nKX0mYDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICghcmVwbGFjZWQpIHJlc3VsdCArPSBgJHtuZXdQYXJhbUtleX09JHtuZXdQYXJhbVZhbHVlfSZgO1xyXG4gICAgcmV0dXJuIHJlc3VsdC5zbGljZSgwLCAtMSkgKyBsb2NhdGlvbi5oYXNoO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmVhcHBseVNvcnRpbmcodGFibGUsIHBhcnRpYWxPcHRpb25zKXtcclxuICAgIGNvbnNvbGUubG9nKCdyZWFwbHkgc29ydGluZycpXHJcbiAgICByZXNldFNvcnRpbmcodGFibGUpO1xyXG4gICAgaWYocGFydGlhbE9wdGlvbnNbJ3NvcnRlZEJ5J10pIHBhcnRpYWxPcHRpb25zWydzb3J0ZWRCeSddLnJldmVyc2UoKS5zbGljZSgtNCkuZm9yRWFjaChzb3J0U3RlcCA9PiB7XHJcbiAgICAgIGlmKHNvcnRTdGVwLmRpciA9PSAnZGVzYycpe1xyXG4gICAgICAgIG9uU29ydENsaWNrKHRhYmxlLCBzb3J0U3RlcC5jb2wpXHJcbiAgICAgIH1cclxuICAgICAgb25Tb3J0Q2xpY2sodGFibGUsIHNvcnRTdGVwLmNvbClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUYWJsZUNvbXBvbmVudCBpcyB0aGUgaW1wbGVtZW50YXRpb24gb2Ygd2MtZ3JpZC10YWJsZSAoc2hvcnQ6IHdndCkuXHJcbiAgICogXHJcbiAgICogVGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgYXJlIGV4cG9zZWQgd2hlbiBjcmVhdGluZyBhIHdndCBIVE1MIGVsZW1lbnQgKGRvY3VtZW50ZWQgaW4gdGhlcmUgcmVzcGVjdGl2ZSBkb2NzdHJpbmcpOlxyXG4gICAqICAtIHVzZURlZmF1bHRPcHRpb25zKClcclxuICAgKiAgLSBjb25uZWN0ZWRDYWxsYmFjaygpXHJcbiAgICogIC0gc2V0RGVib3VuY2VGbihkZWJvdW5jZUZuLCBzb3J0RGVib3VuY2VPcHRpb25zLCBmaWx0ZXJEZWJvdW5jZWRPcHRpb25zKVxyXG4gICAqICAtIHNldERhdGEoZGF0YSlcclxuICAgKiAgLSBnZXREaXNwbGF5ZWREYXRhKClcclxuICAgKiAgLSBnZXRPcmlnaW5hbERhdGEoKVxyXG4gICAqICAtIHJlZHJhd0RhdGEoKVxyXG4gICAqIFxyXG4gICAqIFRoZSBmb2xsb3dpbmcgcHJvcGVydGllcyBjYW4gYmUgYWNjZXNzZWQgZGlyZWN0bHk6XHJcbiAgICogIC0gcm9vdF9kb2N1bWVudCAtIGVpdGhlciBkb2N1bWVudCBvciB0aGUgY29ubmVjdGVkIHNoYWRvd1Jvb3RcclxuICAgKiAgLSBjb25kaXRpb25hbENvbHVtblN0eWxlIC0gYW4gb2JqZWN0IHdpdGgga2V5cyBbXCJjb25kaXRpb25cIiwgXCJzdHlsZXNcIl0gd2hlcmUgY29uZGl0aW9uIGlzIGEgZnVuY3Rpb24gXCIoZGF0YSA6IEFycmF5PE9iamVjdD4gLCBjb2x1bW4gOiBzdHJpbmcpID0+IEJvb2xlYW5cIiBhbmQgc3R5bGVzIGlzXHJcbiAgICogICAgYW4gQXJyYXkgb2Ygc3RyaW5ncyB3aXRoIHN0eWxlcywgdGhhdCBzaG91bGQgYXBwbHkgd2hlbiBcImNvbmRpdGlvblwiIHJldHVybnMgdHJ1ZSBmb3IgYSBjb2x1bW4uXHJcbiAgICogICAgQ2FuIGJlIHVzZWQgdG8gc3R5bGUgYSBjb2x1bW4gaW4gZGVwZW5kZW5jeSBvZiB0aGVpciBkYXRhLiBcclxuICAgKiAgLSBjb25kaXRpb25hbFN0eWxlT3B0aW9ucyAtIGFuIG9iamVjdCB3aXRoIG9wdGlvbnMgY29uY2VybmluZyBjb25kaXRpb25hbENvbHVtblN0eWxlIGFuZCBjb25kaXRpb25hbFJvd1N0eWxlLiBBdmFpbGFibGUgT3B0aW9uczpcclxuICAgKiAgICAgIC0gYWN0aXZlOiBCb29sZWFuXHJcbiAgICogIC0gZm9ybWF0dGVyIC0gYW4gT2JqZWN0IHdpdGggY29sdW1uIG5hbWVzIGFzIGtleXMsIGNvbnRhaW5pbmcgbGlzdHMgb2YgZm9ybWF0dGVyIGZ1bmN0aW9ucywgdGhhdCBzaG91bGQgYmUgYXBwbGllZCBiZWZvcmUgZGlzcGxhaW5nIGEgdGFibGUgdmFsdWUuIEZvcm1hdHRlciBmdW5jdGlvbnNcclxuICAgKiAgICBoYXZlIHRoaXMgc2lnbmF0dXJlOiBcIih2YWx1ZSwgcm93SW5kZXgsIGNvbXBsZXRlRGF0YSkgPT4gYW55XCIuIEZvcm1hdHRlciBnZXQgYXBwbGllZCBpbiB0aGUgc2VxdWVuY2UgdGhleSBhcmUgaW4gdGhlIGxpc3QgKGxlZnRtb3N0IGZ1bmN0aW9uICgybmQgZnJvbSBsZWZ0ICgzcmQgLi4uKSkpLlxyXG4gICAqICAtIGZvcm1hdHRlck9wdGlvbnMgLSBhbiBvYmplY3Qgd2l0aCBvcHRpb25zIGNvbmNlcm5pbmcgZm9ybWF0dGVyLiBBdmFpbGFibGUgT3B0aW9uczpcclxuICAgKiAgICAgIC0gYWN0aXZlOiBCb29sZWFuXHJcbiAgICogIC0gZmlsdGVyIC0gYW4gT2JqZWN0IHdpdGggY29sdW1uIG5hbWVzIGFzIGtleXMsIGNvbnRhaW5pbmcgc3RyaW5ncyB3aGljaCBjb3JyZXNwb25kIHRvIHRoZSBmaWx0ZXIgaW5wdXQgdmFsdWVzIGluIHRoZSB1aS4gXHJcbiAgICogICAgVGhvc2UgZ2V0IHZhbGlkYXRlZCBieSBmaWx0ZXJPcGVyYXRpb25zLmZuLlxyXG4gICAqICAtIGZpbHRlck9wdGlvbnMgLSBhbiBvYmplY3Qgd2l0aCBvcHRpb25zIGNvbmNlcm5pbmcgZmlsdGVyLiBBdmFpbGFibGUgT3B0aW9uczpcclxuICAgKiAgICAgIC0gYWN0aXZlOiBCb29sZWFuXHJcbiAgICogIC0gZmlsdGVyT3BlcmF0aW9ucyAtIGFuIG9iamVjdCB3aXRoIG9wZXJhdGlvbnMsIGZpbHRlcnMgYW5kIGNoYXJzIGZvciBkaWZmZXJlbnQgZmlsdGVyIG9wdGlvbnMgdG9nZ2xlYWJsZS4gYHtDb2x1bW4xOiB7bmFtZTogJ21vZEZpbHRlcicsIGNoYXI6ICclJywgZm46IGZ1bmN0aW9uKGZpbHRlcklucHV0LCB0ZXN0VmFsdWUpfX1gXHJcbiAgICogIC0gc29ydGVkQnkgLSBhbiBBcnJheSBvZiBPYmplY3RzIGRlc2NyaWJpbmcgc29ydGluZy4gS2V5cyBhcmUgY29sIC0gY29sdW1uIG5hbWUgc29ydGVkIC0gYW5kIGRpciAtIHRoZSBzb3J0IGRpcmVjdGlvbiAob25lIG9mIFtcImFzY1wiLCBcImRlc2NcIl0pLiBTb3J0aW5nIGlzIGtlcHQgYWZ0ZXIgZWFjaFxyXG4gICAqICAgIHNvcnRpbmcgb3BlcmF0aW9uLCBzbyB0aGF0IHByaW1hcnksIHNlY29uZGFyeSwgdGVydGlhcnksIC4uLiBzb3J0aW5nIGlzIHBvc3NpYmxlLlxyXG4gICAqICAtIHNvcnRPcHRpb25zIC0gYW4gb2JqZWN0IHdpdGggb3B0aW9ucyBjb25jZXJuaW5nIHNvcnRpbmcuIEF2YWlsYWJsZSBPcHRpb25zOlxyXG4gICAqICAgICAgLSBhY3RpdmU6IEJvb2xlYW5cclxuICAgKiAgLSBjdXN0b21DaG9vc2VTb3J0c0NvbXBhcmVGbiAtIGEgZnVuY3Rpb24gbWFwcyBjb2x1bW5zIHRvIHNvcnRpbmcgYmVoYXZpb3IuIEV4cGVjdGVkIHJldHVybiBmb3IgZ2l2ZW4gKHRhYmxlOiBUYWJsZUNvbXBvbmVudCBpbnN0YW5jZSwgZGF0YTogQXJyYXk8T2JqZWN0PiwgY29sdW1uOiBzdHJpbmcpXHJcbiAgICogICAgaXMgYSBmdW5jdGlvbiB0byBjb21wYXJlIHRoZSB2YWx1ZXMgb2YgdGhpcyBjb2x1bW4uXHJcbiAgICogIC0gY3VzdG9tQ29tcGFyZU51bWJlcnMgLyBjdXN0b21Db21wYXJlVGV4dCAtIGZ1bmN0aW9ucyB0byByZXBsYWNlIGRlZmF1bHQgc29ydCBiZWhhdmlvciBjb3JyZXNwb25pbmcgdG8gc29ydGluZyBudW1iZXJzIC8gdGV4dC4gTGlrZSBkZWZhdWx0IGpzIENvbXBhcmVGbiB1c2VkIGluIEFycmF5LnByb3RvdHlwZS5zb3J0XHJcbiAgICovXHJcbiAgY2xhc3MgVGFibGVDb21wb25lbnQgZXh0ZW5kcyBIVE1MRWxlbWVudHtcclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgIHN1cGVyKCk7XHJcblxyXG4gICAgICBkZWZpbmVTZXRQcm90b3R5cGVGdW5jdGlvbnMoKTtcclxuXHJcbiAgICAgIHRoaXMubGlua09wdGlvbnMgPSBbXHJcbiAgICAgICAgJ3BhZ2luYXRpb24nLFxyXG4gICAgICAgICdmaWx0ZXInLFxyXG4gICAgICAgICdzb3J0ZWRCeScsXHJcbiAgICAgICAgJ2FjdGl2ZUZpbHRlck9wZXJhdGlvbnMnLFxyXG4gICAgICAgICdoaWRkZW5Db2x1bW5zJyxcclxuICAgICAgICAndmlzaWJsZUNvbHVtbnMnLFxyXG4gICAgICAgIC8vICd0aWNrZWRSb3dzJyxcclxuICAgICAgXVxyXG5cclxuICAgICAgZGVmaW5lSGlkZGVuUHJvcGVydGllcyh0aGlzLCBbXHJcbiAgICAgICAgJ29wdGlvbnMnLFxyXG4gICAgICAgICdyb290X2RvY3VtZW50JyxcclxuICAgICAgICAnb3B0aW9uYWxEZWJvdW5jZUZuJyxcclxuICAgICAgICAnc29ydGVkRGF0YScsXHJcbiAgICAgICAgJ2RhdGEnLFxyXG4gICAgICAgICdoZWFkZXInLFxyXG4gICAgICAgICdkaXNwbGF5ZWREYXRhJyxcclxuICAgICAgICAnZHJhd09wdGlvbmFscycsXHJcbiAgICAgICAgJ2VsZW1lbnRzJyxcclxuICAgICAgICAndGFibGVJZCcsXHJcbiAgICAgIF0pO1xyXG5cclxuICAgICAgdGhpcy5vcHRpb25zID0ge31cclxuXHJcbiAgICAgIGRlZmluZU9wdGlvblByb3BlcnRpZXModGhpcywgW1xyXG4gICAgICAgICdjb25kaXRpb25hbENvbHVtblN0eWxlJyxcclxuICAgICAgICAnY29uZGl0aW9uYWxSb3dTdHlsZScsXHJcbiAgICAgICAgJ2NvbmRpdGlvbmFsU3R5bGVPcHRpb25zJyxcclxuICAgICAgICAnZm9ybWF0dGVyJyxcclxuICAgICAgICAnZm9ybWF0dGVyT3B0aW9ucycsXHJcbiAgICAgICAgJ2ZpbHRlcicsXHJcbiAgICAgICAgJ2ZpbHRlck9wdGlvbnMnLFxyXG4gICAgICAgICdmaWx0ZXJPcGVyYXRpb25zJyxcclxuICAgICAgICAnYWN0aXZlRmlsdGVyT3BlcmF0aW9ucycsXHJcbiAgICAgICAgJ3NvcnRlZEJ5JyxcclxuICAgICAgICAnc29ydE9wdGlvbnMnLFxyXG4gICAgICAgICdwYWdpbmF0aW9uJyxcclxuICAgICAgICAnY3VzdG9tQ29tcGFyZU51bWJlcnMnLFxyXG4gICAgICAgICdjdXN0b21Db21wYXJlVGV4dCcsXHJcbiAgICAgICAgJ2N1c3RvbUNob29zZVNvcnRzQ29tcGFyZUZuJyxcclxuICAgICAgICAnaGlkZGVuQ29sdW1ucycsXHJcbiAgICAgICAgJ2hpZGRlbkNvbHVtbnNDb25kaXRpb24nLFxyXG4gICAgICAgICd2aXNpYmxlQ29sdW1ucycsXHJcbiAgICAgICAgJ3RpY2tlZFJvd3MnLFxyXG4gICAgICBdKTtcclxuXHJcbiAgICAgIHRoaXMudXNlRGVmYXVsdE9wdGlvbnMoKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlc2V0IE9wdGlvbnMgdG8gdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbi5cclxuICAgICAqL1xyXG4gICAgdXNlRGVmYXVsdE9wdGlvbnMoKXtcclxuICAgICAgdGhpcy5yb290X2RvY3VtZW50ID0gZG9jdW1lbnQ7XHJcblxyXG4gICAgICB0aGlzLmVsZW1lbnRzID0ge307XHJcblxyXG4gICAgICAvLyB0aGlzLnRhYmxlSWQgPSAwO1xyXG4gICAgICB0aGlzLnRhYmxlSWQgPSB0YWJsZUNvdW50ZXIrKztcclxuXHJcbiAgICAgIHRoaXMuZGF0YSA9IFtdO1xyXG4gICAgICBcclxuICAgICAgdGhpcy5oaWRkZW5Db2x1bW5zID0gW107IC8vIFsnRWluemVscHJlaXMnXTtcclxuICAgICAgdGhpcy52aXNpYmxlQ29sdW1ucyA9IFtdO1xyXG4gICAgICB0aGlzLmhpZGRlbkNvbHVtbnNDb25kaXRpb24gPSBbXHJcbiAgICAgICAgKGNvbHVtbiwgZGF0YSkgPT4gKGNvbHVtbi5zdGFydHNXaXRoKCcjJykpLFxyXG4gICAgICBdO1xyXG5cclxuICAgICAgdGhpcy5lbGVtZW50cy5zb3J0QXJyb3dzID0ge307XHJcbiAgICAgIHRoaXMub3B0aW9uYWxEZWJvdW5jZUZuID0gdW5kZWZpbmVkO1xyXG4gICAgICB0aGlzLmFjdGl2ZUZpbHRlck9wZXJhdGlvbnMgPSB7fTtcclxuXHJcbiAgICAgIHRoaXMucGFnaW5hdGlvbk9wdGlvbnMgPSB7XHJcbiAgICAgICAgYWN0aXZlOiB0cnVlLFxyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnBhZ2luYXRpb24gPSB7XHJcbiAgICAgICAgYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgIGN1cnJlbnRQYWdlOiAxLFxyXG4gICAgICAgIHBhZ2VTaXplOiA0MCxcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5maWx0ZXJPcGVyYXRpb25zID0gW1xyXG4gICAgICAgIHtuYW1lOiAnY29udGFpbnNFeCcsIGNoYXI6ICcmc3ViZTsnLCBmbjogcmVnZXhGaWx0ZXIuYmluZChudWxsLCBmYWxzZSl9LCBcclxuICAgICAgICB7bmFtZTogJ25vdENvbnRhaW5zRXgnLCBjaGFyOiAnJiM4ODQwOycsIGZuOiByZWdleEZpbHRlci5iaW5kKG51bGwsIHRydWUpfSwgXHJcbiAgICAgICAge25hbWU6ICdlcXVhbHMnLCBjaGFyOiAnPScsIGZuOiBjb21wYXJlRmlsdGVyLmJpbmQobnVsbCwgKGEsIGIpID0+IGEgPT0gYil9LCBcclxuICAgICAgICB7bmFtZTogJ2dyZWF0ZXInLCBjaGFyOiAnPicsIGZuOiBjb21wYXJlRmlsdGVyLmJpbmQobnVsbCwgKGEsIGIpID0+IGEgPCBiKX0sIFxyXG4gICAgICAgIHtuYW1lOiAnZ3JlYXRlckVxdWFscycsIGNoYXI6ICcmZ2U7JywgZm46IGNvbXBhcmVGaWx0ZXIuYmluZChudWxsLCAoYSwgYikgPT4gYSA8PSBiKX0sIFxyXG4gICAgICAgIHtuYW1lOiAnbGVzc2VyJywgY2hhcjogJzwnLCBmbjogY29tcGFyZUZpbHRlci5iaW5kKG51bGwsIChhLCBiKSA9PiBhID4gYil9LCBcclxuICAgICAgICB7bmFtZTogJ2xlc3NlckVxdWFscycsIGNoYXI6ICcmbGU7JywgZm46IGNvbXBhcmVGaWx0ZXIuYmluZChudWxsLCAoYSwgYikgPT4gYSA+PSBiKX0sIFxyXG4gICAgICAgIHtuYW1lOiAndW5FcXVhbHMnLCBjaGFyOiAnJm5lOycsIGZuOiBjb21wYXJlRmlsdGVyLmJpbmQobnVsbCwgKGEsIGIpID0+IGEgIT0gYil9LCBcclxuICAgICAgXVxyXG5cclxuICAgICAgdGhpcy5jb25kaXRpb25hbENvbHVtblN0eWxlID0gW107IC8qW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGNvbmRpdGlvbjogKGRhdGEsIGNvbHVtbikgPT4gKCFOdW1iZXIuaXNOYU4oZGF0YS5yZWR1Y2UoKGNvbCwgY3VyKSA9PiAoY29sICs9IHR5cGVvZiBjdXJbY29sdW1uXSA9PT0gXCJzdHJpbmdcIiA/IE5hTiA6IChjdXJbY29sdW1uXSAhPSB1bmRlZmluZWQgPyBjdXJbY29sdW1uXSA6IDApKSwgMCkpKSxcclxuICAgICAgICAgIHN0eWxlczogW1widGV4dC1hbGlnbjogcmlnaHQ7XCJdXHJcbiAgICAgICAgfSxcclxuICAgICAgXSovXHJcblxyXG4gICAgICB0aGlzLmNvbmRpdGlvbmFsUm93U3R5bGUgPSB7XHJcbiAgICAgICAvKiBSYWJhdHRzYXR6OiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbmRpdGlvbjogZnVuY3Rpb24odmFsdWUsIGluZGV4KXtcclxuICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPT0gMCAmJiBpbmRleCAlIDIgIT0gMDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3R5bGVzOiBbXCJiYWNrZ3JvdW5kLWNvbG9yOiBsaWdodGNvcmFsO1wiLCBcImNvbG9yOiBibGFjaztcIl0sXHJcbiAgICAgICAgICAgIGZ1bGxyb3c6IHRydWVcclxuICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgY29uZGl0aW9uOiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpe1xyXG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA9PSAwICYmIGluZGV4ICUgMiA9PSAwO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdHlsZXM6IFtcImJhY2tncm91bmQtY29sb3I6IGRhcmtzYWxtb247XCIsIFwiY29sb3I6IGJsYWNrO1wiXSxcclxuICAgICAgICAgICAgZnVsbHJvdzogdHJ1ZVxyXG4gICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBjb25kaXRpb246IGZ1bmN0aW9uKHZhbHVlLCBpbmRleCl7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID4gMCAmJiBpbmRleCAlIDIgIT0gMDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3R5bGVzOiBbXCJiYWNrZ3JvdW5kLWNvbG9yOiBsaWdodGdyZWVuO1wiLCBcImNvbG9yOiBibGFjaztcIl0sXHJcbiAgICAgICAgICAgIGZ1bGxyb3c6IHRydWVcclxuICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgY29uZGl0aW9uOiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpe1xyXG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+IDAgJiYgaW5kZXggJSAyID09IDA7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0eWxlczogW1wiYmFja2dyb3VuZC1jb2xvcjogZGFya3NlYWdyZWVuO1wiLCBcImNvbG9yOiBibGFjaztcIl0sXHJcbiAgICAgICAgICAgIGZ1bGxyb3c6IHRydWVcclxuICAgICAgICAgIH1cclxuICAgICAgICBdKi9cclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5jb25kaXRpb25hbFN0eWxlT3B0aW9ucyA9IHtcclxuICAgICAgICBcImFjdGl2ZVwiOiB0cnVlLFxyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmZvcm1hdHRlciA9IHt9XHJcbiAgICAgIHRoaXMuZm9ybWF0dGVyT3B0aW9ucyA9IHtcclxuICAgICAgICBcImFjdGl2ZVwiOiB0cnVlLFxyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmZpbHRlciA9IHt9XHJcbiAgICAgIHRoaXMuZmlsdGVyT3B0aW9ucyA9IHtcclxuICAgICAgICBcImFjdGl2ZVwiOiB0cnVlLFxyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnNvcnRlZEJ5ID0gW107XHJcbiAgICAgIHRoaXMuc29ydE9wdGlvbnMgPSB7XHJcbiAgICAgICAgXCJhY3RpdmVcIjogdHJ1ZSxcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmN1c3RvbUNvbXBhcmVOdW1iZXJzID0gY29tcGFyZU51bWJlcnM7XHJcbiAgICAgIHRoaXMuY3VzdG9tQ29tcGFyZVRleHQgPSBjb21wYXJlVGV4dDtcclxuICAgICAgdGhpcy5jdXN0b21DaG9vc2VTb3J0c0NvbXBhcmVGbiA9IGNob29zZVNvcnRzQ29tcGFyZUZuO1xyXG4gICAgICBcclxuICAgICAgdGhpcy5kcmF3T3B0aW9uYWxzID0ge307XHJcblxyXG4gICAgICB0aGlzLnRpY2tlZFJvd3MgPSBbXTtcclxuICAgIH1cclxuXHJcbiAgICBsb2FkUGFydGlhbE9wdGlvbnMocGFydGlhbE9wdGlvbnMpe1xyXG4gICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA+IDApe1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdwYXJ0aWFsJywgcGFydGlhbE9wdGlvbnMpXHJcbiAgICAgICAgT2JqZWN0LmtleXMocGFydGlhbE9wdGlvbnMpLnNvcnQoKGEsIGIpID0+IChhID09ICdoaWRkZW5Db2x1bW5zJykgPyAxIDogLTEpLmZvckVhY2gob3B0aW9uID0+IHtcclxuICAgICAgICAgIGlmKG9wdGlvbiA9PSAnc29ydGVkQnknKXtcclxuICAgICAgICAgICAgcmVhcHBseVNvcnRpbmcodGhpcywgcGFydGlhbE9wdGlvbnMpO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChvcHRpb24gPT0gJ2hpZGRlbkNvbHVtbnMnKSB7XHJcbiAgICAgICAgICAgIHRoaXNbb3B0aW9uXSA9IHBhcnRpYWxPcHRpb25zW29wdGlvbl07XHJcbiAgICAgICAgICAgIHRoaXMucmVkcmF3VGFibGUoKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXNbb3B0aW9uXSA9IHBhcnRpYWxPcHRpb25zW29wdGlvbl07XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG9wdGlvbiwgdGhpc1tvcHRpb25dKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXNldEZpbHRlck9wZXJhdGlvbnModGhpcylcclxuICAgICAgICB0aGlzLnJlZHJhd0RhdGEoKVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VyaWFsaXplTGlua09wdGlvbnMoKXtcclxuICAgICAgbGV0IGxpbmtPcHRpb25zID0gbmV3IE9iamVjdCgpO1xyXG4gICAgICB0aGlzLmxpbmtPcHRpb25zLmZvckVhY2gob3B0aW9uID0+IHtcclxuICAgICAgICBsaW5rT3B0aW9uc1tvcHRpb25dID0gdGhpc1tvcHRpb25dO1xyXG4gICAgICB9KVxyXG4gICAgICBsZXQgbmV3U2VyaWFsaXplZFZhbHVlID0gYnRvYShKU09OLnN0cmluZ2lmeShsaW5rT3B0aW9ucywgKGtleSwgdmFsdWUpID0+IHZhbHVlIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBzZXJpYWxpemVGdW5jdGlvbih2YWx1ZSkgOiB2YWx1ZSkpO1xyXG4gICAgICBsZXQgbmV3VXJsU2VhcmNoUGFyYW0gPSByZXBsYWNlVXJsU2VhcmNoUGFyYW1ldGVyKGB0YWJsZSR7dGhpcy50YWJsZUlkfWAsIG5ld1NlcmlhbGl6ZWRWYWx1ZSk7XHJcbiAgICAgIGlmKHRoaXMuZHJhd09wdGlvbmFscy5yZXdyaXRldXJsKSBoaXN0b3J5LnJlcGxhY2VTdGF0ZShoaXN0b3J5LnN0YXRlLCAnJywgbmV3VXJsU2VhcmNoUGFyYW0pXHJcbiAgICB9XHJcblxyXG4gICAgbG9hZExpbmtPcHRpb25zKCl7XHJcbiAgICAgIGxldCBzZXJpYWxpemVkT3B0aW9ucyA9ICd7fSc7XHJcbiAgICAgIGxvY2F0aW9uLnNlYXJjaC5zbGljZSgxKS5zcGxpdCgnJicpLmZvckVhY2goc2VhcmNoT3B0aW9uID0+IHtcclxuICAgICAgICBsZXQgc3BsaXQgPSBzZWFyY2hPcHRpb24uc3BsaXQoJz0nKVxyXG4gICAgICAgIGlmKHNwbGl0WzBdID09IGB0YWJsZSR7dGhpcy50YWJsZUlkfWApe1xyXG4gICAgICAgICAgc2VyaWFsaXplZE9wdGlvbnMgPSBhdG9iKHNwbGl0LnNsaWNlKDEpLmpvaW4oJz0nKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgICBsZXQgcGFydGlhbE9wdGlvbnMgPSBKU09OLnBhcnNlKHNlcmlhbGl6ZWRPcHRpb25zLCAoa2V5LCB2YWx1ZSkgPT4ge1xyXG4gICAgICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpICAmJiB2YWx1ZS50b1N0cmluZygpLm1hdGNoKGZ1blJlZ2V4KSkge1xyXG4gICAgICAgICAgcmV0dXJuIGRlc2VyaWFsaXplRnVuY3Rpb24odmFsdWUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBwYXJ0aWFsT3B0aW9ucztcclxuICAgICAgLy8gdGhpcy5yZWRyYXdEYXRhKCk6XHJcbiAgICB9XHJcblxyXG4gICAgZGVzZXJpYWxpemVPcHRpb25zKHNlcmlhbGl6ZWRPcHRpb25zKXtcclxuICAgICAgaWYoc2VyaWFsaXplZE9wdGlvbnMpe1xyXG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGF0b2Ioc2VyaWFsaXplZE9wdGlvbnMsIChrZXksIHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KSAgJiYgdmFsdWUudG9TdHJpbmcoKS5tYXRjaChmdW5SZWdleCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRlc2VyaWFsaXplRnVuY3Rpb24odmFsdWUpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4ge307XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsb2FkU2VyaWFsaXplZE9wdGlvbnMoc2VyaWFsaXplZE9wdGlvbnMpe1xyXG4gICAgICB0aGlzLm9wdGlvbnMgPSBKU09OLnBhcnNlKHNlcmlhbGl6ZWRPcHRpb25zLCAoa2V5LCB2YWx1ZSkgPT4ge1xyXG4gICAgICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpICAmJiB2YWx1ZS50b1N0cmluZygpLm1hdGNoKGZ1blJlZ2V4KSkge1xyXG4gICAgICAgICAgcmV0dXJuIGRlc2VyaWFsaXplRnVuY3Rpb24odmFsdWUpXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJldHVybiB2YWx1ZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICAgIC8vIHRoaXMuc29ydGVkRGF0YSA9IGFwcGx5U29ydGluZyh0aGlzKTtcclxuICAgICAgdGhpcy50aWNrZWRSb3dzID0gdGhpcy5vcHRpb25zLnRpY2tlZFJvd3M7XHJcbiAgICAgIHRoaXMucmVkcmF3RGF0YSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGVkIHdoZW4gdGFibGUgaXMgYWRkZWQgdG8gRE9NLiBEb2Vzbid0IG5lZWQgdG8gYmUgY2FsbGVkIG1hbnVhbGx5LlxyXG4gICAgICovXHJcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpe1xyXG4gICAgICBpZighdGhpcy5yb290X2RvY3VtZW50LmJvZHkpIHRoaXMucm9vdF9kb2N1bWVudC5ib2R5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYm9keScpO1xyXG4gICAgICBpZighdGhpcy5yb290X2RvY3VtZW50LmhlYWQpIHRoaXMucm9vdF9kb2N1bWVudC5oZWFkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaGVhZCcpO1xyXG5cclxuICAgICAgLy8gdGhpcy50YWJsZUlkID0gdGhpcy5yb290X2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy53Z3QtZ3JpZC1jb250YWluZXInKS5sZW5ndGg7IC8vLy8gVE9ETzogY2hlY2sgaWYgbXVsdGlwbGUgdGFibGVzIGhhdmUgY29uc2lzdGFudGx5IGRpZmZlcmVudCBpZHMuXHJcbiAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZChgdGFibGUtaWQtJHt0aGlzLnRhYmxlSWR9YCk7ICAgICAgXHJcbiAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZCgnd2d0LWdyaWQtY29udGFpbmVyJylcclxuICAgICAgaWYoIXRoaXMuc29ydGVkRGF0YSAmJiB0aGlzLmRhdGEpIHRoaXMuc29ydGVkRGF0YSA9IHRoaXMuZGF0YS5tYXAodmFsdWUgPT4gdmFsdWUpO1xyXG4gICAgICBsZXQgaGVpZ2h0ID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hlaWdodCcpO1xyXG4gICAgICBpZihoZWlnaHQpIHRoaXMuc3R5bGUubWF4SGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgICBsZXQgcGFnZVNpemUgPSB0aGlzLmdldEF0dHJpYnV0ZSgncGFnZS1zaXplJyk7XHJcbiAgICAgIGlmKHBhZ2VTaXplKSB7XHJcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uLnBhZ2VTaXplID0gcGFnZVNpemU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMubG9hZEluaXRpYWxPcHRpb25zKCk7XHJcbiAgICAgIGRyYXdUYWJsZSh0aGlzKTtcclxuICAgIH1cclxuIFxyXG4gICAgbG9hZEluaXRpYWxPcHRpb25zKCl7XHJcbiAgICAgIGxldCBhdHRyaWJ1dGVPcHRpb25zID0gdGhpcy5kZXNlcmlhbGl6ZU9wdGlvbnModGhpcy5nZXRBdHRyaWJ1dGUoJ29wdGlvbnMnKSk7XHJcbiAgICAgIGxldCBsaW5rT3B0aW9ucyA9IHRoaXMubG9hZExpbmtPcHRpb25zKCk7XHJcblxyXG4gICAgICAoKG5ldyBTZXQoT2JqZWN0LmtleXMoYXR0cmlidXRlT3B0aW9ucykpKS51bmlvbihPYmplY3Qua2V5cyhsaW5rT3B0aW9ucykpKS5mb3JFYWNoKG9wdGlvbiA9PiB7XHJcbiAgICAgICAgaWYoYXR0cmlidXRlT3B0aW9uc1tvcHRpb25dKXtcclxuICAgICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb25dID0gYXR0cmlidXRlT3B0aW9uc1tvcHRpb25dO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihsaW5rT3B0aW9uc1tvcHRpb25dICYmIE9iamVjdC5rZXlzKGxpbmtPcHRpb25zW29wdGlvbl0pLmxlbmd0aCAhPSAwKXtcclxuICAgICAgICAgIHRoaXMub3B0aW9uc1tvcHRpb25dID0gbGlua09wdGlvbnNbb3B0aW9uXTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLm9wdGlvbnMpXHJcblxyXG4gICAgICB0aGlzLmxvYWRQYXJ0aWFsT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xyXG4gICAgfSBcclxuXHJcbiAgICAvKipcclxuICAgICAqIENvbmZpZ3VyZSBhIGRlYm91bmNlIGZ1bmN0aW9uIGZvciBldmVudCBiYXNlZCB0YWJsZSBjaGFuZ2VzIGxpa2Ugc29ydENsaWNrIGFuZCBmaWx0ZXJDaGFuZ2UuXHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGRlYm91bmNlRm4gYSBkZWJvdW5jZSBmdW5jdGlvbjsgaGFzIHRvIHJldHVybiB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uOyB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHNob3VsZCBpbXBsZW1lbnQgYSBjYW5jZWwgZnVuY3Rpb24uICh0ZXN0ZWQgd2l0aCBsb2Rhc2guZGVib3VuY2UpXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5PGFueT59IHNvcnREZWJvdW5jZU9wdGlvbnMgdGhlIGFyZ3VtZW50cyBsaXN0IGZvciB0aGUgc29ydCBjbGljayBldmVudCByZXF1aXJlZCBieSB0aGUgZGVib3VuY2UgZnVuY3Rpb24uXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5PGFueT59IGZpbHRlckRlYm91bmNlZE9wdGlvbnMgdGhlIGFyZ3VtZW50cyBsaXN0IGZvciB0aGUgZmlsdGVyIGNoYW5nZSBldmVudCByZXF1aXJlZCBieSB0aGUgZGVib3VuY2UgIGJ5IHRoZSBkZWJvdW5jZSBmdW5jdGlvbi5cclxuICAgICAqL1xyXG4gICAgc2V0RGVib3VuY2VGbihkZWJvdW5jZUZuLCBzb3J0RGVib3VuY2VPcHRpb25zLCBmaWx0ZXJEZWJvdW5jZWRPcHRpb25zKXtcclxuICAgICAgaWYodGhpcy5vcHRpb25hbERlYm91bmNlRm4pIHtcclxuICAgICAgICBvblNvcnRDbGljay5jYW5jZWwoKVxyXG4gICAgICAgIGZpbHRlckNoYW5nZWQuY2FuY2VsKClcclxuICAgICAgfVxyXG4gICAgICB0aGlzLm9wdGlvbmFsRGVib3VuY2VGbiA9IGRlYm91bmNlRm47XHJcbiAgICAgIG9uU29ydENsaWNrID0gdGhpcy5vcHRpb25hbERlYm91bmNlRm4ob25Tb3J0Q2xpY2ssIC4uLnNvcnREZWJvdW5jZU9wdGlvbnMpO1xyXG4gICAgICBmaWx0ZXJDaGFuZ2VkID0gdGhpcy5vcHRpb25hbERlYm91bmNlRm4oZmlsdGVyQ2hhbmdlZCwgLi4uZmlsdGVyRGVib3VuY2VkT3B0aW9ucyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZXQgdGhlIGRhdGEgdG8gYmUgZGlzcGxheWVkIGJ5IHRhYmxlIGFzIGEgbGlzdCBvZiByb3cgb2JqZWN0cy5cclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtBcnJheTxPYmplY3Q+fSBkYXRhIFxyXG4gICAgICovXHJcbiAgICBzZXREYXRhKGRhdGEpe1xyXG4gICAgICAvLyBsZXQgZGF0YVdpdGhJbmNsdWRlID0gZGF0YS5tYXAoZW50cnkgPT4ge1xyXG4gICAgICAvLyAgIGxldCB0ZW1wUm93ID0gZW50cnk7XHJcbiAgICAgIC8vICAgLy8gZGVsZXRlIHRlbXBSb3dbJyNpbmNsdWRlJ107XHJcbiAgICAgIC8vICAgLy8gdGVtcFJvd1snI2luY2x1ZGUnXSA9ICd4JztcclxuICAgICAgLy8gICBsZXQgcmVzdWx0ID0geycjaW5jbHVkZSc6ICd4J307XHJcbiAgICAgIC8vICAgT2JqZWN0LmtleXModGVtcFJvdykuZm9yRWFjaChrZXkgPT4ge1xyXG4gICAgICAvLyAgICAgcmVzdWx0W2tleV0gPSB0ZW1wUm93W2tleV07IFxyXG4gICAgICAvLyAgIH0pXHJcbiAgICAgIC8vICAgLy8gbGV0IHJlc3VsdCA9IHsnI2luY2x1ZGUnOiAneCcsIC4uLnRlbXBSb3d9O1xyXG4gICAgICAvLyAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgIC8vIH0pO1xyXG4gICAgICAvLyBsZXQgZGF0YVdpdGhJbmNsdWRlID0gZGF0YTtcclxuICAgICAgLy8gY29uc29sZS5sb2coJ3dpdGggSW5jbHVkZScsIGRhdGFXaXRoSW5jbHVkZSk7XHJcbiAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRyYW5zZm9ybVRvR3JvdXBlZERhdGEoZGF0YSwgW1wiQmVsSURcIiwgXCJCZWxlZ2RhdHVtXCIsIFwiTGllZmVyYW50XCIsIFwiTmV0dG9iZXRyYWdcIl0pKVxyXG4gICAgICB0aGlzLnNvcnRlZERhdGEgPSB0aGlzLmRhdGEubWFwKHZhbHVlID0+IHZhbHVlKTtcclxuICAgICAgZHJhd1RhYmxlKHRoaXMpO1xyXG4gICAgICB0aGlzLmxvYWRJbml0aWFsT3B0aW9ucygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IHRoZSBkYXRhIHRoYXQgaXMgc29ydGVkLCBmb3JtYXR0ZWQgYW5kIGZpbHRlcmVkLlxyXG4gICAgICovXHJcbiAgICBnZXREaXNwbGF5ZWREYXRhKCl7XHJcbiAgICAgIHJldHVybiB0aGlzLmRpc3BsYXllZERhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgdGhlIG9yaWdpbmFsIERhdGEgdGhhdCB3YXMgc3VwcGxpZWQgdG8gdGhlIHRhYmxlLlxyXG4gICAgICovXHJcbiAgICBnZXRPcmlnaW5hbERhdGEoKXtcclxuICAgICAgcmV0dXJuIHRoaXMuZGF0YTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZvcmNlIGEgcmVmcmVzaCwgaW4gY2FzZSB0aGUgZGF0YSBoYXMgY2hhbmdlZC4gQWx0ZXJuYXRpdmVseSB5b3UgY2FuIGNhbGwgVGFibGVDb21wb25lbnQuc2V0RGF0YShuZXdEYXRhKS5cclxuICAgICAqL1xyXG4gICAgcmVkcmF3RGF0YSgpe1xyXG4gICAgICB0aGlzLmhlYWRlci5mb3JFYWNoKGNvbHVtbiA9PiB7XHJcbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudHMuZGF0YUNlbGxzW2NvbHVtbl0pIFtdLmZvckVhY2guY2FsbCh0aGlzLmVsZW1lbnRzLmRhdGFDZWxsc1tjb2x1bW5dLCBlbGVtZW50ID0+IGVsZW1lbnQucmVtb3ZlKCkpO1xyXG4gICAgICAgIGlmICh0aGlzLmRyYXdPcHRpb25hbHMuZmlsdGVyICYmIHRoaXMuZWxlbWVudHMuZmlsdGVyQ2VsbHNbY29sdW1uXS5maXJzdENoaWxkLnRleHRDb250ZW50ICE9IHRoaXMuZmlsdGVyW2NvbHVtbl0pIHRoaXMuZWxlbWVudHMuZmlsdGVyQ2VsbHNbY29sdW1uXS5maXJzdENoaWxkLnRleHRDb250ZW50ID0gdGhpcy5maWx0ZXJbY29sdW1uXTtcclxuICAgICAgICAvLyB0aGlzLmVsZW1lbnRzLmZpbHRlckNlbGxzW2NvbHVtbl0uZmlyc3RDaGlsZC50ZXh0Q29udGVudCA9IHRoaXMuZmlsdGVyW2NvbHVtbl0gPyB0aGlzLmZpbHRlcltjb2x1bW5dIDogJyc7XHJcblxyXG4gICAgICB9KTsgXHJcbiAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID4gMCl7XHJcbiAgICAgICAgbGV0IHdhc1NlbGVjdGVkID0gdGhpcy5lbGVtZW50cy5wYWdlQ2hvb3NlciA/IHRoaXMuZWxlbWVudHMucGFnZUNob29zZXIuY2xhc3NMaXN0LmNvbnRhaW5zKCdzZWxlY3RlZCcpIDogZmFsc2U7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5ZWREYXRhID0gZHJhd0RhdGEodGhpcyk7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50cy5wYWdlQ2hvb3NlciA9IGNyZWF0ZVBhZ2VDaG9vc2VyKHRoaXMsIHRoaXMuZGlzcGxheWVkRGF0YSk7XHJcbiAgICAgICAgaWYgKHRoaXMuZHJhd09wdGlvbmFscy5mb290ZXIpIGNyZWF0ZUZvb3Rlcih0aGlzLCB0aGlzLmRpc3BsYXllZERhdGEsIHRoaXMuZWxlbWVudHMucGFnZUNob29zZXIpO1xyXG4gICAgICAgIGlmICh3YXNTZWxlY3RlZCkgdGhpcy5lbGVtZW50cy5wYWdlQ2hvb3Nlci5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVkcmF3VGFibGUoKXtcclxuICAgICAgLy90aGlzLnNvcnRlZERhdGEgPSB0aGlzLmRhdGEubWFwKHZhbHVlID0+IHZhbHVlKTtcclxuICAgICAgbGV0IHBhcnRpYWxPcHRpb25zID0ge307XHJcbiAgICAgIE9iamVjdC5rZXlzKHRoaXMub3B0aW9ucykuZm9yRWFjaChvcHRpb24gPT4ge1xyXG4gICAgICAgIGlmKHRoaXMubGlua09wdGlvbnMuaW5jbHVkZXMob3B0aW9uKSl7XHJcbiAgICAgICAgICBwYXJ0aWFsT3B0aW9uc1tvcHRpb25dID0gdGhpc1tvcHRpb25dO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICAgIGRyYXdUYWJsZSh0aGlzKTtcclxuICAgICAgcmVhcHBseVNvcnRpbmcodGhpcywgcGFydGlhbE9wdGlvbnMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtyZWdleEZpbHRlciwgdGV4dEZpbHRlciwgY29tcGFyZU51bWJlcnMsIGNvbXBhcmVUZXh0LCBjaG9vc2VTb3J0c0NvbXBhcmVGbiwgZGVmaW5lQ3VzdG9tRWxlbWVudCwgVGFibGVDb21wb25lbnR9O1xyXG59KSgpIiwidmFyIGNzcyA9IFwiZGl2LndndC1oZWFkZXIgZGl2IHtcXG4gIHdvcmQtd3JhcDogbm9ybWFsO1xcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcXG59XFxucHJvdC10YWJsZS12MyB1bCB7XFxuICBwYWRkaW5nLXRvcDogNXB4O1xcbiAgcGFkZGluZy1sZWZ0OiAxMHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XFxufVxcblwiOyAocmVxdWlyZShcImJyb3dzZXJpZnktY3NzXCIpLmNyZWF0ZVN0eWxlKGNzcywgeyBcImhyZWZcIjogXCJzdHlsZS5jc3NcIiB9LCB7IFwiaW5zZXJ0QXRcIjogXCJib3R0b21cIiB9KSk7IG1vZHVsZS5leHBvcnRzID0gY3NzOyJdfQ==
