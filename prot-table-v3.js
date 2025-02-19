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
},{"./MarkInput":1,"./style.css":9,"lodash.debounce":4,"wc-grid-table/src/wc-grid-table.js":8}],3:[function(require,module,exports){
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
function regexFilter(negate, filterInput, testValue) {
    // let negate = filterInput.substring(0, 3) === '!!!';
    // filterInput = negate ? filterInput.substring(3) : filterInput;
    let result = false;
    if (testValue != undefined) {
        let matches = testValue.toString().match(new RegExp(filterInput, 'i'));
        result = Boolean(matches) && matches.length > 0;
    }
    return negate ? !result : result;
}

function stripHtml(html) {
    let doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
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
function textFilter(negate, filterInput, testValue) {
    // let negate = filterInput.substring(0, 3) === '!!!';
    // filterInput = negate ? filterInput.substring(3) : filterInput;
    let result = false;
    if (testValue != undefined) {
        result = stripHtml(testValue.toString()).toUpperCase().includes(stripHtml(filterInput).toUpperCase());
    }
    return negate ? !result : result;
}

function compareFilter(operation, filterInput, testValue) {
    let result = false;
    if (testValue != undefined) {
        try {
            result = operation(Number.parseFloat(filterInput), Number.parseFloat(testValue));
        } catch (err) {
            result = operation(filterInput.toString(), testValue.toString());
        }
    }
    return result;
}

module.exports = { regexFilter, textFilter, compareFilter };
},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
var css = "/* body {\r\n  font: arial, sans-serif;\r\n} */\n.wgt-grid-container {\n  display: grid;\n  position: static;\n  max-width: min-content;\n  max-height: 500px;\n  overflow-y: scroll;\n  background: lightgray;\n  /* grid-gap: 1px; */\n  /* grid-row-gap: 2px; */\n  grid-column-gap: 2px;\n  border: 1px solid lightgray;\n}\n.header-col-tooltip {\n  position: absolute;\n  font-weight: bold;\n  border: 1px solid lightgray;\n  border-right: 1px dotted lightgray;\n  pointer-events: none;\n  z-index: 99;\n  visibility: hidden;\n  margin: -1px;\n}\n.header-col-tooltip.visible {\n  visibility: visible;\n}\n.wgt-header {\n  font-weight: bold;\n  position: sticky;\n  box-sizing: border-box;\n  top: 0px;\n  border-bottom: 1px solid lightgray;\n  overflow-y: hidden;\n}\n.wgt-header>div.arrow {\n  /* visibility: hidden; */\n  color: lightgray;\n  width: 1em;\n  position: absolute;\n  font-weight: bold;\n  top: 0px;\n  bottom: 0px;\n  right: 0px;\n  padding-right: 5px;\n  margin-top: auto;\n  margin-bottom: auto;\n  font-family: monospace;\n  font-size: large;\n  vertical-align: middle;\n  padding-top: 5px;\n  padding-bottom: 5px;\n  cursor: pointer;\n  -moz-user-select: text;\n  background: white;\n  text-align: center;\n  transform: scale(1, 2)translate(20%, 13%);\n}\n.wgt-col-header-container {\n  width: 1em;\n  overflow-x: visible;\n}\n.wgt-filter_cell {\n  position: sticky;\n  top: 0px;\n  background: white;\n  box-sizing: border-box;\n  width: 100%;\n  height: 2em;\n  text-align: center;\n  vertical-align: middle;\n  font-size: 1rem;\n  border-bottom: 1px solid lightgray;\n  box-shadow: inset 1px 1px 5px 0px lightgrey;\n  padding-top: 5px;\n  padding-bottom: 5px;\n  margin-top: auto;\n  margin-bottom: auto;\n}\n.filter_input {\n  position: absolute;\n  top: 0px;\n  left: 0px;\n  bottom: 0px;\n  right: 0px;\n  margin-top: auto;\n  margin-bottom: auto;\n  padding-top: 5px;\n  padding-bottom: 5px;\n}\n.filter_negator {\n  position: absolute;\n  font-weight: bold;\n  top: 0px;\n  bottom: 0px;\n  left: 0px;\n  padding-left: 5px;\n  margin-top: auto;\n  margin-bottom: auto;\n  font-family: monospace;\n  font-size: 1em;\n  vertical-align: middle;\n  padding-top: 5px;\n  padding-bottom: 5px;\n  cursor: pointer;\n}\n.wgt-cell {\n  box-sizing: border-box;\n  font-size: 1rem;\n  padding-left: 20px;\n  padding-right: 20px;\n  padding-top: 10px;\n  padding-bottom: 10px;\n  background: white;\n  /* border: 2px solid lightgray; */\n  overflow-x: hidden;\n}\n.wgt-data-cell {\n  max-width: 500px;\n}\n.wgt-data-cell-money {\n  text-align: end;\n}\n.wgt-header.wgt-cell {\n  padding-right: 30px;\n}\n.wgt-zebra_1 {\n  background: white;\n}\n.wgt-zebra_0 {\n  background: rgb(230, 230, 230);\n}\n.wgt-footer {\n  display: grid;\n  position: sticky;\n  bottom: 0px;\n  background: white;\n  border-top: 1px solid lightgray;\n  grid-template-rows: 1fr;\n  grid-template-columns: repeat(4, fit-content(300px)) 1fr;\n}\n.footer-button {\n  position: relative;\n  border: 1px solid rgba(27, 31, 35, .2);\n  /* border-radius: .25em; */\n  width: max-content;\n  overflow: visible;\n  cursor: pointer;\n  background-color: #eff3f6;\n  background-image: linear-gradient(-180deg, #fafbfc, eff3f6, 90%);\n  background-repeat: repeat-x;\n  background-position: -1px -1px;\n  background-size: 110% 110%;\n  -webkit-appearance: none;\n  -moz-appearance: none;\n  appearance: none;\n  user-select: none;\n}\n.footer-button:hover {\n  box-shadow: inset 0px 0px 20px 2px rgba(0, 0, 0, 0.2);\n}\n.footer-button-down:after {\n  display: inline-block;\n  width: 0px;\n  height: 0px;\n  vertical-align: -2px;\n  content: \"\";\n  border: 4px solid transparent;\n  border-top-color: currentcolor;\n}\n.column-chooser-menu-container {\n  /* position: absolute; */\n  position: relative;\n  width: 200px;\n  height: min-content;\n  /* top: 0px; */\n  /* bottom: 0px; */\n  left: 0px;\n  /* right: 0px; */\n  /* background-color: rgba(0,0,0,.5); */\n  z-index: 99;\n  visibility: visible;\n}\n.column-chooser-menu {\n  margin-top: auto;\n  margin-bottom: auto;\n  overflow: hidden;\n  color: black;\n  border: 1px solid rgba(100, 100, 100, 0.5);\n  border-radius: 5px;\n  list-style: none;\n  padding-left: 0px;\n  background-color: lightgray;\n  box-shadow: 1px 2px 10px 2px rgba(0, 0, 0, 0.2);\n}\n.column-chooser-menu-container.hidden {\n  visibility: hidden;\n  height: 0px;\n}\n.column-chooser-item {\n  background-color: white;\n  /* border-radius: 5px; */\n  margin-top: 1px;\n  user-select: none;\n  white-space: nowrap;\n}\n.column-chooser-item:first-child {\n  margin-top: 0px;\n}\n.column-chooser-item:hover {\n  background-color: lightblue;\n  box-sizing: border-box;\n  background-clip: padding-box;\n  border-radius: 5px;\n}\n.column-chooser-item>label {\n  display: block;\n  cursor: pointer;\n  padding: 5px 20px 5px 5px;\n}\n.page-chooser {\n  display: grid;\n  grid-template-rows: auto;\n  grid-template-columns: repeat(9, auto);\n  font-family: monospace;\n  grid-column: -1;\n  border-left: none;\n  position: sticky;\n  right: 0px;\n}\n.page-chooser.selected {\n  border-left: 1px dotted gray;\n}\n.page-change {\n  margin-top: auto;\n  margin-bottom: auto;\n  padding-left: 5px;\n  padding-right: 5px;\n}\n.page-change:first-child {\n  margin-top: auto !important;\n}\n.page-change:not(.page-change-disabled) {\n  cursor: pointer;\n}\n.page-change-disabled {\n  color: gray;\n}\n.active-page {\n  font-weight: bold;\n}\n.wgt-footer_cell {\n  border-right: 1px solid lightgray;\n  width: max-content;\n}\n@-moz-document url-prefix()  {\n  .wgt-grid-container div:nth-last-child(2).wgt-data-cell {\n    height: 200%;\n  }\n\n  .filter_negator {\n    font-size: 1em;\n  }\n}\n"; (require("browserify-css").createStyle(css, { "href": "node_modules\\wc-grid-table\\src\\wc-grid-table.css" }, { "insertAt": "bottom" })); module.exports = css;
},{"browserify-css":3}],8:[function(require,module,exports){
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
// const { TableComponent } = require('./wc-grid-table.js');

/**
 * @typedef {{[functionName: string]: (async (...unkown) => unknown)}} tablePluginClassExtensionFunctions
 * 
 * @typedef {{
 *    name: string, 
 *    exec: async () => void, 
 *    type: string, 
 *    tableExtensions?: tablePluginClassExtensionFunctions,
 * }} TablePlugin 
 */

/** @type {TablePlugin} */
var test;
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
                footer.classList.add('wgt-footer');
                footer.style.gridColumn = `1 / ${table.header.length + 1}`;

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
                  filtered_row_count.classList.add('wgt-footer_cell', 'wgt-cell');
                  footer.append(filtered_row_count);
                  table.elements.filtered_row_count = filtered_row_count;
              }
  
              if(footer) footer.append(createColumnChooserButton(table));
              if(table.drawOptionals.rewriteurl) footer.append(createResetLinkButton(table));
              if(pageChooser) footer.append(pageChooser);
              if(table.elements.footer) table.elements.footer.remove();
              table.elements.footer = footer;
              if(table.plugins.ui) Reflect.ownKeys(table.plugins.ui).forEach(pluginKey => table.plugins.ui[pluginKey].addFooterButton(table));
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
        cell.classList.add('wgt-cell', 'wgt-data-cell', `wgt-column_${column.split(' ').join('_')}`, `wgt-row_${rowIndex}`, `wgt-zebra_${rowIndex % 2}`);
        if(column.includes('€')) cell.classList.add('wgt-data-cell-money');
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
    let formattedData = table.formattedData = applyFormatter(table.sortedData, table.header, table.formatter, table.formatterOptions);
    let filteredData = table.filteredData = applyFilter(table, formattedData, table.header, table.filter, table.filterOptions);
    table.pagination.filteredDataCount = filteredData.length;
    let pageinatedData = table.pageinatedData = applyPagination(table, filteredData);
    console.log({
      'header': table.header,
      'sorted data': table.sortedData, 
      'formatted data': formattedData,
      'filtered data': filteredData,
      'paginated data': pageinatedData
    });
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
        'plugins',
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

      this.plugins = {data: {}};

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
    _setData(data){
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

    setData (data){
      this._setData(data);
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

    /**
     * register a plugin, which is called somewhere in the lifecycle of TableComponent (depending on pluginType).
     * @param {TablePlugin} plugin
     * @param {string} pluginType - specifies at which point the plugins exec method is called. One of `[data]`
     * @throws {Error} when pluginType isn't known 
     */
    registerPlugin(plugin){
      console.log(plugin);
      if (!this.plugins[plugin.type]) this.plugins[plugin.type] = {};
      this.plugins[plugin.type][plugin.name] = plugin;
      let extensionMethods = Reflect.ownKeys(plugin.tableExtensions);
      extensionMethods.forEach(method => {
        if(!TableComponent.prototype[method]) TableComponent.prototype[method] = plugin.tableExtensions[method].bind(this);
      });
      switch(plugin.type){
        case "data":
          let setDataFn = this.setData.bind(this);
          this.setData = function(data) {
            // console.log({important: this});
            
            plugin.exec.bind(this)(data).then( (modifiedData) => {
              // this._setData(modifiedData);
              setDataFn(modifiedData);
            }); 
          }
          break;
        case "ui":
          // plugin.exec(this);
          break;
        default:
          throw new Error("")
          break;
      }
    }
    
  }

  return {regexFilter, textFilter, compareNumbers, compareText, chooseSortsCompareFn, defineCustomElement, TableComponent};
})()
},{"./filter-utils.js":5,"./pagination-utils.js":6,"./wc-grid-table.css":7}],9:[function(require,module,exports){
var css = "div.wgt-header div {\n  word-wrap: normal;\n  white-space: nowrap;\n}\nprot-table-v3 ul {\n  padding-top: 5px;\n  padding-left: 10px;\n  background-color: white;\n}\n"; (require("browserify-css").createStyle(css, { "href": "style.css" }, { "insertAt": "bottom" })); module.exports = css;
},{"browserify-css":3}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJNYXJrSW5wdXQuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5LWNzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5kZWJvdW5jZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy93Yy1ncmlkLXRhYmxlL3NyYy9maWx0ZXItdXRpbHMuanMiLCJub2RlX21vZHVsZXMvd2MtZ3JpZC10YWJsZS9zcmMvcGFnaW5hdGlvbi11dGlscy5qcyIsIm5vZGVfbW9kdWxlcy93Yy1ncmlkLXRhYmxlL3NyYy93Yy1ncmlkLXRhYmxlLmNzcyIsIm5vZGVfbW9kdWxlcy93Yy1ncmlkLXRhYmxlL3NyYy93Yy1ncmlkLXRhYmxlLmpzIiwic3R5bGUuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcHpDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8vIGNvbnN0IHsgUHJvdFRhYmxlLCBUYWJsZUNvbXBvbmVudCB9ID0gcmVxdWlyZSgnLi9pbmRleCcpO1xyXG5cclxuLy8gLyoqXHJcbi8vICAqIEB0eXBlZGVmIHtpbXBvcnQoJy4vaW5kZXgnKS5UYWJsZUNvbXBvbmVudH0gVGFibGVDb21wb25lbnRcclxuLy8gICogQHR5cGVkZWYge2ltcG9ydCgnLi9pbmRleCcpLlByb3RUYWJsZX0gUHJvdFRhYmxlXHJcbi8vICAqL1xyXG5cclxuLyoqXHJcbiAqIEhlYWRlciBmb3IgZmV0Y2ggcmVxdWVzdHMgdG8gdGhlIGRiLWludGVyZmFjZS4gQ29udGVudC1UeXBlIG5lZWRzIHRvIGJlIFwiYXBwbGljYXRpb24vanNvblwiLlxyXG4gKi9cclxuY29uc3QgaGVhZGVyID0ge1xyXG4gICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgdGhlIGJvZHkgZm9yIHRoZSBmZXRjaCByZXF1ZXN0IHRvIHRoZSBkYi1pbnRlcmZhY2UuXHJcbiAqIEBwYXJhbSB7KCkgPT4gc3RyaW5nfSBxdWVyeUZuIC0gY2FsbGJhY2ssIHRoYXQgZ2VuZXJhdGVzIHRoZSBxdWVyeSwgYnkgc3Vic3RpdHV0aW5nIHRoZSByZXF1aXJlZCBpbmZvcm1hdGlvbiBpbnRvIGEgcXVlcnkgdGVtcGxhdGUuXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IC0gdGhlIHN0cmluZ2lmaWVkIGpzb24gYm9keVxyXG4gKi9cclxuY29uc3QgY3JlYXRlRmV0Y2hCb2R5ID0gKHF1ZXJ5Rm4pID0+IEpTT04uc3RyaW5naWZ5KHsgcXVlcnk6IHF1ZXJ5Rm4oKSB9KTtcclxuXHJcbi8vIGNvbnN0IGluc2VydFF1ZXJ5ID0gKGFydGlrZWxudW1tZXIpID0+IGBJTlNFUlQgSU5UTyBJbnZlbnR1ckN1cnJlbnRSZWNvdW50IChBcnRpa2VsbnVtbWVyKSBWQUxVRVMgKCcke2FydGlrZWxudW1tZXJ9Jyk7YDtcclxuLy8gY29uc3QgZGVsZXRlUXVlcnkgPSAoYXJ0aWtlbG51bW1lcikgPT4gYERFTEVURSBGUk9NIEludmVudHVyQ3VycmVudFJlY291bnQgV0hFUkUgQXJ0aWtlbG51bW1lciA9ICcke2FydGlrZWxudW1tZXJ9JztgO1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgdGhlIGRhdGFiYXNlLWludGVyZmFjZSBsaW5rIGZvciBhIGdpdmVuIGRhdGFiYXNlbmFtZSBhbmQgdXNlcm5hbWUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhYmFzZSAtIGRhdGFiYXNlIG5hbWUgXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB1c2VybmFtZSAtIGRhdGFiYXNlIHVzZXJuYW1lIFxyXG4gKiBAcmV0dXJucyBcclxuICovXHJcbmNvbnN0IGRhdGFiYXNlVXJsID0gKGRhdGFiYXNlLCB1c2VybmFtZSkgPT4gYGh0dHBzOi8vZGF0YWJhc2UucHJvdHJvbmljLWdtYmguZGUvcXVlcnk/ZGF0YWJhc2U9JHtkYXRhYmFzZX0mdXNlcm5hbWU9JHt1c2VybmFtZX1gO1xyXG5cclxuLyoqIFxyXG4gKiBBIHF1ZXJ5IHRvIGNyZWF0ZSB0aGUgdGFibGUsIGlmIGl0IGRvZXMgbm90IGV4aXN0IHlldC4gXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhYmFzZVRhYmxlIC0gbmFtZSBvZiB0aGUgdGFibGUgXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IC0gdGhlIHF1ZXJ5IHRvIGJlIHNlbmQgdG8gdGhlIGRiXHJcbiAqL1xyXG5jb25zdCBjcmVhdGVUYWJsZVF1ZXJ5ID0gKGRhdGFiYXNlVGFibGUpID0+IGBJRiBOT1QgRVhJU1RTIChTRUxFQ1QgKiBGUk9NIHN5cy50YWJsZXMgV0hFUkUgc3lzLnRhYmxlcy5uYW1lID0gJyR7ZGF0YWJhc2VUYWJsZX0nKSBDUkVBVEUgVEFCTEUgJHtkYXRhYmFzZVRhYmxlfShpZGVudGlmaWVyRmllbGQgTlZBUkNIQVIoTUFYKSwgaWRlbnRpZmllclZhbHVlIE5WQVJDSEFSKE1BWCkpO2A7XHJcblxyXG4vKipcclxuICogQSBxdWVyeSB0byBnZXQgYWxsIGlkZW50aWZpZXJWYWx1ZXMgZnJvbSBhIGdpdmVuIGRhdGFiYXNlVGFibGUuXHJcbiAqIEBwYXJhbSB7Kn0gZGF0YWJhc2VUYWJsZSAtIG5hbWUgb2YgdGhlIHRhYmxlIFxyXG4gKiBAcGFyYW0geyp9IGlkZW50aWZpZXJGaWVsZCAtIHRoZSBuYW1lIG9mIHRoZSBwcmltYXJ5LWtleS1maWVsZFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSAtIHRoZSBxdWVyeSB0byBiZSBzZW5kIHRvIHRoZSBkYlxyXG4gKi9cclxuY29uc3Qgc2VsZWN0Q2hlY2tlZEZvckFsbCA9IChkYXRhYmFzZVRhYmxlLCBpZGVudGlmaWVyRmllbGQpID0+IGBTRUxFQ1QgW2lkZW50aWZpZXJWYWx1ZV0gRlJPTSAke2RhdGFiYXNlVGFibGV9IFdIRVJFIFtpZGVudGlmaWVyRmllbGRdID0gJyR7aWRlbnRpZmllckZpZWxkfScgR1JPVVAgQlkgW2lkZW50aWZpZXJWYWx1ZV07YDtcclxuXHJcbi8qKlxyXG4gKiBBIHF1ZXJ5IHRvIGluc2VydCB2YWx1ZXMgaW50byB0aGUgZGF0YWJhc2VUYWJsZS4gTWFya2VkIFZhbHVlcyBhcmUgc2F2ZWQgdG8gZGIsIHVubWFya2VkIG9uZXMgYXJlIG5vdC5cclxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGFiYXNlVGFibGUgLSBuYW1lIG9mIHRoZSB0YWJsZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaWRlbnRpZmllckZpZWxkIC0gdGhlIG5hbWUgb2YgdGhlIHByaW1hcnkta2V5LWZpZWxkXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZGVudGlmaWVyVmFsdWUgLSB0aGUgdmFsdWUgKG9mIHRhYmxlLmRhdGEpIGZvciB0aGlzIHJvdy4gKGlkZW50aWZpZXJWYWx1ZSA9IHRhYmxlLmRhdGFbcm93XVtpZGVudGlmaWVyRmllbGRdKVxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSAtIHRoZSBxdWVyeSB0byBiZSBzZW5kIHRvIHRoZSBkYlxyXG4gKi9cclxuY29uc3QgaW5zZXJ0UXVlcnkgPSAoZGF0YWJhc2VUYWJsZSwgaWRlbnRpZmllckZpZWxkLCBpZGVudGlmaWVyVmFsdWUpID0+IGBJTlNFUlQgSU5UTyAke2RhdGFiYXNlVGFibGV9IChpZGVudGlmaWVyRmllbGQsIGlkZW50aWZpZXJWYWx1ZSkgVkFMVUVTICgnJHtpZGVudGlmaWVyRmllbGR9JywgJyR7aWRlbnRpZmllclZhbHVlfScpO2A7XHJcblxyXG4vKipcclxuICogQSBxdWVyeSB0byBkZWxldGUgYWxsIHZhbHVlcyBmcm9tIHRoZSB0YWJsZSwgd2hpY2ggaGF2ZSBtYXRjaGluZyBpZGVudGlmaWVyLWZpZWxkcyBhbmQgLXZhbHVlcy5cclxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGFiYXNlVGFibGUgLSBuYW1lIG9mIHRoZSB0YWJsZVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaWRlbnRpZmllckZpZWxkIC0gdGhlIG5hbWUgb2YgdGhlIHByaW1hcnkta2V5LWZpZWxkXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZGVudGlmaWVyVmFsdWUgLSB0aGUgdmFsdWUgKG9mIHRhYmxlLmRhdGEpIGZvciB0aGlzIHJvdy4gKGlkZW50aWZpZXJWYWx1ZSA9IHRhYmxlLmRhdGFbcm93XVtpZGVudGlmaWVyRmllbGRdKVxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSAtIHRoZSBxdWVyeSB0byBiZSBzZW5kIHRvIHRoZSBkYlxyXG4gKi9cclxuY29uc3QgZGVsZXRlUXVlcnkgPSAoZGF0YWJhc2VUYWJsZSwgaWRlbnRpZmllckZpZWxkLCBpZGVudGlmaWVyVmFsdWUpID0+IGBERUxFVEUgRlJPTSAke2RhdGFiYXNlVGFibGV9IFdIRVJFIGlkZW50aWZpZXJGaWVsZCA9ICcke2lkZW50aWZpZXJGaWVsZH0nIEFORCBpZGVudGlmaWVyVmFsdWUgPSAnJHtpZGVudGlmaWVyVmFsdWV9JztgO1xyXG5cclxuLyoqXHJcbiAqIFNhbml0aXplcyB1c2VyIGNvbnRyb2xsZWQgaW5wdXQgZm9yIHVzZSBpbiBzcWwgcXVlcmllcy4gVE9ETzogbmVlZHMgdG8gYmUgaW1wbGVtZW50ZWQgb24gdGhlIHNlcnZlci5cclxuICogQHBhcmFtIHtzdHJpbmd9IHNxbCAtIHVuc2FuaXRpemVkIHNxbCBpbnB1dFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSAtIHNhbml0aXplZCBzcWwgaW5wdXRcclxuICovXHJcbmZ1bmN0aW9uIHNhbml0aXplU3FsKHNxbCkgeyB0aHJvdyBuZXcgRXJyb3IoJ3VuaW1wbGVtZW50ZWQgZnVuY3Rpb24nKTsgfVxyXG5cclxuLyoqXHJcbiAqIFNlYXJjaGVzIGZvciB0aGUgY2xvc2VzdCBhbmNlc3RvciBlbGVtZW50LCB0aGF0IGlzIGEgd2MtZ3JpZC10YWJsZSBvciBleHRlbmRzIGZyb20gaXQuXHJcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnRcclxuICogQHJldHVybnMge3VuZGVmaW5lZHxIVE1MRWxlbWVudH0gLSB0aGUgY2xvc2VzdCBhbmNlc3RvciBlbGVtZW50LCB0aGF0IGlzIGEgd2MtZ3JpZC10YWJsZVxyXG4gKi9cclxuZnVuY3Rpb24gc2VhcmNoUGFyZW50VGFibGUoZWxlbWVudCkge1xyXG4gICAgbGV0IGN1cnJlbnRFbGVtZW50ID0gZWxlbWVudDtcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgY3VycmVudEVsZW1lbnQgPSBjdXJyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50O1xyXG4gICAgICAgIGlmIChjdXJyZW50RWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09ICdib2R5Jykge1xyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoY3VycmVudEVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSAncHJvdC10YWJsZS12MycgfHwgY3VycmVudEVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PSAnd2MtZ3JpZC10YWJsZScpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRFbGVtZW50O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgTWFya0lucHV0IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xyXG4gICAgLyoqXHJcbiAgICAgKiBMaWZlaG9vayBvZiB3ZWJjb21wb25lbnRzLCB0aGF0IGlzIGNhbGxlZCwgd2hlbiB0aGUgY29tcG9uZW50IGhhcyBsb2FkZWQuIFxyXG4gICAgICovXHJcbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcclxuICAgICAgICAvLyBzdXBlci5jb25uZWN0ZWRDYWxsYmFjaygpO1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBIHN0b3JlIGZvciBWYWx1ZXMgdGhhdCBhcmUgbWVhbnQgdG8gYmUgc2V0IGJ5IHRoaXMgZWxlbWVudHMgYXR0cmlidXRlcy5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmRhdGFBdHRyaWJ1dGVzID0ge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIHRhYmxlIGZpZWxkLCB0aGF0IGlzIHVzZWQgYXMgcHJpbWFyeSBrZXkuIEF0dHJpYnV0ZSBcImlkZW50aWZpZXJmaWVsZFwiIHJlcXVpcmVkIVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgSWRlbnRpZmllckZpZWxkOiB0aGlzLmdldEF0dHJpYnV0ZSgnaWRlbnRpZmllcmZpZWxkJyksXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIHRhYmxlIHZhbHVlIG9mIHRoZSBkYXRhLklkZW50aWZpZXJGaWVsZCBmb3IgdGhpcyByb3cuIENhbiBiZSBzZXQgYnkgYWRkaW5nIHRoZSBcImlkZW50aWZpZXJmaWVsZFwiIGF0dHJpYnV0ZS4gVGhlIFwiaWRlbnRpZmllcmZpZWxkXCIgYXR0cmlidXRlIGlzIHJlcXVpcmVkISBcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIElkZW50aWZpZXJWYWx1ZTogdGhpcy5nZXRBdHRyaWJ1dGUoJ2lkZW50aWZpZXJ2YWx1ZScpLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBkYXRhYmFzZSBpbiBTUUxTZXJ2ZXIsIHdoZXJlIHRoZSBEYXRhYmFzZVRhYmxlIGlzIHN1cHBvc2VkIHRvIGJlLiBDYW4gYmUgc2V0IHZpYSB0aGUgXCJkYXRhYmFzZVwiIGF0dHJpYnV0ZSBhbmQgaXMgb3B0aW9uYWwgKGRlZmF1bHQ6IFwiTWFya2VyREJcIikuIFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgRGF0YWJhc2U6IHRoaXMuZ2V0QXR0cmlidXRlKCdkYXRhYmFzZScpID8gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGFiYXNlJykgOiBcIk1hcmtlckRCXCIsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIGRhdGFiYXNlIHVzZXIsIHRoYXQgaXMgdXNlZCBmb3Igc2F2aW5nIGRhdGEgdG8gdGhlIGRiLiBJcyBzZXQgYnkgdGhlIFwiZGF0YWJhc2V1c2VyXCIgYXR0cmlidXRlLCB3aGljaCBpcyBvcHRpb25hbCAoZGVmYXVsdDogXCJ3aWtpXCIpIVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgRGF0YWJhc2VVc2VyOiB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YWJhc2V1c2VyJykgPyB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YWJhc2V1c2VyJykgOiBcIndpa2lcIixcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgdGFibGVuYW1lIGZvciBTUUxTZXJ2ZXIsIHdoZXJlIHRoZSBtYXJrZWQgdmFsdWVzIGFyZSBzYXZlZC4gVGhlIGF0dHJpYnV0ZSBcImRhdGFiYXNlVGFibGVcIiBpcyBub3QgYWJzb2x1dGx5IHJlcXVpcmVkLCBidXQgdGhlIGRlZmF1bHQgdGFibGUgaXMgb25seSBhIGZhbGxiYWNrIGFuZCBpdCBzaG91bGQgbm90IGJlIHVzZWQgKGRlZmF1bHQ6IFwiRGVmYXVsdFRhYmxlXCIpIVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgRGF0YWJhc2VUYWJsZTogdGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGFiYXNldGFibGUnKSA/IHRoaXMuZ2V0QXR0cmlidXRlKCdkYXRhYmFzZXRhYmxlJykgOiBcIkRlZmF1bHRUYWJsZVwiLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFdoZW4gdGhlIGh0bWwgYXR0cmlidXRlIFwiY2hlY2tlZFwiIGlzIHNldCwgdGhlIGNoZWNrYm94IGlzIG1hcmtlZC4gT3B0aW9uYWwgKGRlZmF1bHQ6IGZhbHNlKSFcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIElzQ2hlY2tlZDogdGhpcy5oYXNBdHRyaWJ1dGUoJ2NoZWNrZWQnKSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgdGV4dCwgd2hpY2ggaXMgYWRkZWQgdG8gdGhlIGNoZWNrYm94LCBzbyB0aGF0IGl0IGNhbiBiZSBmaWx0ZXJlZCB3aXRoIHRhYmxlLiBNYXJrZXJUZXh0IG5lZWRzIHRvIGJlIGEgc3RyaW5nIHdpdGggXCJ8XCIgYXMgc2VwYXJldG9yIGNoYXJhY3Rlci4gTGVmdCB2YWx1ZSBpcyBmb3IgY2hlY2tlZCwgcmlnaHQgZm9yIHVuY2hlY2tlZC4gT3B0aW9uYWwgKGRlZmF1bHQ6IFwiLTF8MFwiKSBcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIC8vIE1hcmtlclRleHQ6IHRoaXMuZ2V0QXR0cmlidXRlKCdtYXJrZXJ0ZXh0JykgPyB0aGlzLmdldEF0dHJpYnV0ZSgnbWFya2VydGV4dCcpIDogXCJ0cnVlfGZhbHNlXCIsXHJcbiAgICAgICAgICAgIE1hcmtlclRleHQ6IFwidHJ1ZXxmYWxzZVwiLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEEgc3RvcmUgZm9yIHZhbHVlcywgdGhhdCBhcmUgZGV0ZXJtaW5lZCBhdXRvbWF0aWNhbGx5IG9yIGRlcGVuZGVudCBvbiB0aG9zZSBzZXQgaW4gZGF0YUF0dHJpYnV0ZXMuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5kYXRhUHJvcGVydGllcyA9IHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBwcm90LXRhYmxlIHdpdGggaXMgdGhlIGNsb3Nlc3QgYW5jZXN0b3Igb2YgdGhpcyBlbGVtZW50LiAgXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBQYXJlbnRUYWJsZTogc2VhcmNoUGFyZW50VGFibGUodGhpcyksXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIHVybCBmb3IgdGhlIGRhdGFiYXNlIHRoYXQgaXMgc2V0IGluIFwiZGF0YUF0dHJpYnV0ZXMuRGF0YWJhc2VcIi5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIERhdGFiYXNlVXJsOiBkYXRhYmFzZVVybCh0aGlzLmRhdGFBdHRyaWJ1dGVzLkRhdGFiYXNlLCB0aGlzLmRhdGFBdHRyaWJ1dGVzLkRhdGFiYXNlVXNlciksXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIHF1ZXJ5IGZvciBjcmVhdGluZyB0aGUgdGFibGUgKGlmIGl0IGRvZXNuJ3QgZXhpc3QpLiBcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIENyZWF0ZVRhYmxlUXVlcnk6IGNyZWF0ZVRhYmxlUXVlcnkuYmluZCh0aGlzLCB0aGlzLmRhdGFBdHRyaWJ1dGVzLkRhdGFiYXNlVGFibGUpLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBxdWVyeSBmb3IgaW5zZXJ0aW5nIGRhdGEgaW50byB0aGUgdGFibGUuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBJbnNlcnRWYWx1ZXNRdWVyeTogaW5zZXJ0UXVlcnkuYmluZCh0aGlzLCB0aGlzLmRhdGFBdHRyaWJ1dGVzLkRhdGFiYXNlVGFibGUsIHRoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllckZpZWxkLCB0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJWYWx1ZSksXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIHF1ZXJ5IGZvciBkZWxldGluZyBkYXRhIGZyb20gdGhlIHRhYmxlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgRGVsZXRlRnJvbVF1ZXJ5OiBkZWxldGVRdWVyeS5iaW5kKHRoaXMsIHRoaXMuZGF0YUF0dHJpYnV0ZXMuRGF0YWJhc2VUYWJsZSwgdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyRmllbGQsIHRoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllclZhbHVlKSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBIHN0b3JlIGZvciBlbGVtZW50cyB1c2VkIGluIHRoaXMgY29tcG9uZW50LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzID0ge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIGNoZWNrYm94LCB3aGljaCBkaXNwbGF5cyB0aGUgY3VycmVudCBzdGF0ZSBvZiBcImRhdGFBdHRyaWJ1dGVzLklzQ2hlY2tlZFwiLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgQ2hlY2tib3hJbnB1dDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgc3BhbiBlbGVtZW50LCB3aGljaCBoYXMgdGFibGUgZmlsdGVyYWJsZSwgaW52aXNpYmxlIHRleHQgaW5zaWRlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgRmlsdGVyVGV4dFNwYW46IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhgY2hlY2tlZDogJHt0aGlzLmRhdGFBdHRyaWJ1dGVzLklzQ2hlY2tlZH1gKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuZGF0YUF0dHJpYnV0ZXMuSXNDaGVja2VkKSB0aGlzLnNldENoZWNrZWQoZmFsc2UpO1xyXG4gICAgICAgIGVsc2UgdGhpcy51bnNldENoZWNrZWQoKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXR1cE1hcmtJbnB1dEVsZW1lbnQoKTtcclxuICAgICAgICB0aGlzLmNyZWF0ZUNoZWNrYm94SW5wdXQoKTtcclxuICAgICAgICB0aGlzLmNyZWF0ZUZpbHRlckVsZW1lbnQoKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXR1cE1hcmtJbnB1dEVsZW1lbnQoKSB7XHJcbiAgICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKGBtYXJrZXJfJHt0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJWYWx1ZX1gKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSB0aGUgY2hlY2tib3ggaW5wdXQgYW5kIGFkZCBpdCB0byB0aGlzIENvbXBvbmVudHMgSFRNTCBDb250ZXh0LlxyXG4gICAgICovXHJcbiAgICBjcmVhdGVDaGVja2JveElucHV0KCkge1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQudHlwZSA9ICdjaGVja2JveCc7XHJcbiAgICAgICAgdGhpcy5kYXRhRWxlbWVudHMuQ2hlY2tib3hJbnB1dC5vbmNsaWNrID0gdGhpcy5jbGlja0V2ZW50SGFuZGxlci5iaW5kKHRoaXMpO1xyXG4gICAgICAgIGlmICh0aGlzLmRhdGFBdHRyaWJ1dGVzLklzQ2hlY2tlZCkgdGhpcy5kYXRhRWxlbWVudHMuQ2hlY2tib3hJbnB1dC50b2dnbGVBdHRyaWJ1dGUoJ2NoZWNrZWQnLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmFwcGVuZCh0aGlzLmRhdGFFbGVtZW50cy5DaGVja2JveElucHV0KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSB0aGUgc3BhbiwgdGhhdCBpcyB1c2VkIHRvIGZpbHRlciBhbmQgc29ydCBtYXJrZWQgZGF0YS5cclxuICAgICAqL1xyXG4gICAgY3JlYXRlRmlsdGVyRWxlbWVudCgpIHtcclxuICAgICAgICBsZXQgW21hcmtlZFRleHQsIHVubWFya2VkVGV4dF0gPSB0aGlzLmRhdGFBdHRyaWJ1dGVzLk1hcmtlclRleHQuc3BsaXQoJ3wnKTtcclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cy5GaWx0ZXJUZXh0U3Bhbi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkZpbHRlclRleHRTcGFuLnRleHRDb250ZW50ID0gdGhpcy5kYXRhQXR0cmlidXRlcy5Jc0NoZWNrZWQgPyBtYXJrZWRUZXh0IDogdW5tYXJrZWRUZXh0O1xyXG4gICAgICAgIHRoaXMuYXBwZW5kKHRoaXMuZGF0YUVsZW1lbnRzLkZpbHRlclRleHRTcGFuKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENoYW5nZSBhbGwgbmVjYXNzYXJyeSB2YWx1ZXMsIHdoZW4gdGhlIHN0YXR1cyBvZiBJc0NoZWNrZWQgY2hhbmdlcyB0byB0cnVlLlxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSB1cGRhdGVUYWJsZSAtIHRydWUgbWVhbnMgdGhlIHJlc3Qgb2YgdGhlIHRhYmxlIGlzIGdldHRpbmcgYW4gc2V0Q2hlY2tlZChmYWxzZSkgY2FsbC5cclxuICAgICAqL1xyXG4gICAgc2V0Q2hlY2tlZCh1cGRhdGVUYWJsZSkge1xyXG4gICAgICAgIGxldCBbc2V0TWFya2VyLCB1bnNldE1hcmtlcl0gPSB0aGlzLmRhdGFBdHRyaWJ1dGVzLk1hcmtlclRleHQuc3BsaXQoJ3wnKTtcclxuICAgICAgICB0aGlzLmRhdGFBdHRyaWJ1dGVzLklzQ2hlY2tlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy50b2dnbGVBdHRyaWJ1dGUoJ2NoZWNrZWQnLCB0cnVlKTtcclxuICAgICAgICAvLyB0aGlzLnRvZ2dsZUF0dHJpYnV0ZShzZXRNYXJrZXIsIHRydWUpO1xyXG4gICAgICAgIC8vIHRoaXMucmVtb3ZlQXR0cmlidXRlKHVuc2V0TWFya2VyKVxyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQudG9nZ2xlQXR0cmlidXRlKCdjaGVja2VkJywgdHJ1ZSk7XHJcbiAgICAgICAgLy8gdGhpcy5kYXRhRWxlbWVudHMuQ2hlY2tib3hJbnB1dC50b2dnbGVBdHRyaWJ1dGUoc2V0TWFya2VyLCB0cnVlKTtcclxuICAgICAgICAvLyB0aGlzLmRhdGFFbGVtZW50cy5DaGVja2JveElucHV0LnJlbW92ZUF0dHJpYnV0ZShzZXRNYXJrZXIpO1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQuY2hlY2tlZCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5kYXRhRWxlbWVudHMuRmlsdGVyVGV4dFNwYW4udGV4dENvbnRlbnQgPSBzZXRNYXJrZXI7XHJcbiAgICAgICAgLy8gaWYgKHVwZGF0ZVRhYmxlKSB0aGlzLmRhdGFQcm9wZXJ0aWVzLlBhcmVudFRhYmxlLmRhdGEuZmlsdGVyKChlbnRyeSkgPT4gKGNvbnNvbGUubG9nKGVudHJ5WydtYXJrZXInXSksIGVudHJ5W3RoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllckZpZWxkXSA9PSB0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJWYWx1ZSkpLm1hcChlbnRyeSA9PiAoZW50cnlbJ21hcmtlciddLnNldENoZWNrZWQoZmFsc2UpKSk7XHJcbiAgICAgICAgaWYgKHVwZGF0ZVRhYmxlKSB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYC50YWJsZS1pZC0ke3RoaXMuZGF0YVByb3BlcnRpZXMuUGFyZW50VGFibGUudGFibGVJZH0gbWFyay1pbnB1dC5tYXJrZXJfJHt0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJWYWx1ZX1gKS5mb3JFYWNoKChtYXJrZXIpID0+IChtYXJrZXIuc2V0Q2hlY2tlZChmYWxzZSkpKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRNYXJraWVyZW5EYXRhKHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyB0aGlzLnBhcmVudEVsZW1lbnQubmV4dEVsZW1lbnRTaWJsaW5nLnRleHRDb250ZW50ID0gJ2phJztcclxuICAgICAgICB0aGlzLnNldE1hcmtpZXJ0RmllbGQodHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDaGFuZ2UgYWxsIG5lY2Fzc2FycnkgdmFsdWVzLCB3aGVuIHRoZSBzdGF0dXMgb2YgSXNDaGVja2VkIGNoYW5nZXMgdG8gZmFsc2UuXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHVwZGF0ZVRhYmxlIC0gdHJ1ZSBtZWFucyB0aGUgcmVzdCBvZiB0aGUgdGFibGUgaXMgZ2V0dGluZyBhbiBzZXRDaGVja2VkKGZhbHNlKSBjYWxsLlxyXG4gICAgICovXHJcbiAgICB1bnNldENoZWNrZWQodXBkYXRlVGFibGUpIHtcclxuICAgICAgICBsZXQgW3NldE1hcmtlciwgdW5zZXRNYXJrZXJdID0gdGhpcy5kYXRhQXR0cmlidXRlcy5NYXJrZXJUZXh0LnNwbGl0KCd8Jyk7XHJcbiAgICAgICAgdGhpcy5kYXRhQXR0cmlidXRlcy5Jc0NoZWNrZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZSgnY2hlY2tlZCcpO1xyXG4gICAgICAgIC8vIHRoaXMudG9nZ2xlQXR0cmlidXRlKHVuc2V0TWFya2VyKTtcclxuICAgICAgICAvLyB0aGlzLnJlbW92ZUF0dHJpYnV0ZShzZXRNYXJrZXIpO1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQucmVtb3ZlQXR0cmlidXRlKCdjaGVja2VkJyk7XHJcbiAgICAgICAgLy8gdGhpcy5kYXRhRWxlbWVudHMuQ2hlY2tib3hJbnB1dC50b2dnbGVBdHRyaWJ1dGUodW5zZXRNYXJrZXIpO1xyXG4gICAgICAgIC8vIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQucmVtb3ZlQXR0cmlidXRlKHNldE1hcmtlcik7XHJcbiAgICAgICAgdGhpcy5kYXRhRWxlbWVudHMuQ2hlY2tib3hJbnB1dC5jaGVja2VkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5kYXRhRWxlbWVudHMuRmlsdGVyVGV4dFNwYW4udGV4dENvbnRlbnQgPSB1bnNldE1hcmtlcjtcclxuICAgICAgICAvLyBpZiAodXBkYXRlVGFibGUpIHRoaXMuZGF0YVByb3BlcnRpZXMuUGFyZW50VGFibGUuZGF0YS5maWx0ZXIoKGVudHJ5KSA9PiAoZW50cnlbdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyRmllbGRdID09IHRoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllclZhbHVlKSkubWFwKGVudHJ5ID0+IChlbnRyeVt0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJGaWVsZF0udW5zZXRDaGVja2VkKGZhbHNlKSkpO1xyXG4gICAgICAgIGlmICh1cGRhdGVUYWJsZSkge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGAudGFibGUtaWQtJHt0aGlzLmRhdGFQcm9wZXJ0aWVzLlBhcmVudFRhYmxlLnRhYmxlSWR9IG1hcmstaW5wdXQubWFya2VyXyR7dGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWV9YCkuZm9yRWFjaCgobWFya2VyKSA9PiAobWFya2VyLnVuc2V0Q2hlY2tlZChmYWxzZSkpKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRNYXJraWVyZW5EYXRhKGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5zZXRNYXJraWVydEZpZWxkKGZhbHNlKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXRNYXJraWVyZW5EYXRhKGJvb2wpIHtcclxuICAgICAgICB0aGlzLmRhdGFQcm9wZXJ0aWVzLlBhcmVudFRhYmxlLmRhdGEgPSB0aGlzLmRhdGFQcm9wZXJ0aWVzLlBhcmVudFRhYmxlLmRhdGEubWFwKGVudHJ5ID0+IHtcclxuICAgICAgICAgICAgaWYgKGVudHJ5W3RoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllckZpZWxkXSA9PSB0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJWYWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgZW50cnlbJyNtYXJraWVydCddID0gYm9vbCA/ICdqYScgOiAnbmVpbic7XHJcbiAgICAgICAgICAgICAgICBlbnRyeVsnbWFya2VyJ10gPSB0aGlzLmRhdGFQcm9wZXJ0aWVzLlBhcmVudFRhYmxlLmNyZWF0ZU1hcmtJbnB1dChcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJGaWVsZCxcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJWYWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFBdHRyaWJ1dGVzLkRhdGFiYXNlVGFibGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZSxcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFBdHRyaWJ1dGVzLkRhdGFiYXNlVXNlcixcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGFBdHRyaWJ1dGVzLk1hcmtlclRleHQsXHJcbiAgICAgICAgICAgICAgICAgICAgYm9vbFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZW50cnk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0TWFya2llcnRGaWVsZChib29sKSB7XHJcbiAgICAgICAgbGV0IG5leHRTaWJsaW5nID0gdGhpcy5wYXJlbnRFbGVtZW50Lm5leHRFbGVtZW50U2libGluZztcclxuICAgICAgICBpZiAobmV4dFNpYmxpbmcgJiYgbmV4dFNpYmxpbmcuY2xhc3NMaXN0LmNvbnRhaW5zKCd3Z3QtY29sdW1uXyNtYXJraWVydCcpKSB7XHJcbiAgICAgICAgICAgIG5leHRTaWJsaW5nLnRleHRDb250ZW50ID0gYm9vbCA/ICdqYScgOiAnbmVpbic7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlIHRoZSB0YWJsZSBpbiBTUUxTZXJ2ZXIsIGlmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdC5cclxuICAgICAqL1xyXG4gICAgY3JlYXRlVGFibGUoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5kYXRhUHJvcGVydGllcy5DcmVhdGVUYWJsZVF1ZXJ5KCkpO1xyXG4gICAgICAgIGZldGNoKHRoaXMuZGF0YVByb3BlcnRpZXMuRGF0YWJhc2VVcmwsIHtcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyczogaGVhZGVyLFxyXG4gICAgICAgICAgICAgICAgYm9keTogY3JlYXRlRmV0Y2hCb2R5KHRoaXMuZGF0YVByb3BlcnRpZXMuQ3JlYXRlVGFibGVRdWVyeSksXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmaW5pc2hlZCB0YWJsZSBjcmVhdGUgcXVlcnkuJyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGFuZGxlcyB0aGUgY2xpY2sgZXZlbnQgb24gdGhlIGNoZWNrYm94IGVsZW1lbnQuXHJcbiAgICAgKiBAcGFyYW0ge0NsaWNrRXZlbnR9IGV2ZW50IFxyXG4gICAgICovXHJcbiAgICBjbGlja0V2ZW50SGFuZGxlcihldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgaWYgKHRoaXMuZGF0YUF0dHJpYnV0ZXMuSXNDaGVja2VkKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuZGF0YVByb3BlcnRpZXMuRGVsZXRlRnJvbVF1ZXJ5KCkpO1xyXG4gICAgICAgICAgICBmZXRjaCh0aGlzLmRhdGFQcm9wZXJ0aWVzLkRhdGFiYXNlVXJsLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogaGVhZGVyLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6IGNyZWF0ZUZldGNoQm9keSh0aGlzLmRhdGFQcm9wZXJ0aWVzLkRlbGV0ZUZyb21RdWVyeSksXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bnNldENoZWNrZWQodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmRhdGFQcm9wZXJ0aWVzLkluc2VydFZhbHVlc1F1ZXJ5KCkpO1xyXG4gICAgICAgICAgICBmZXRjaCh0aGlzLmRhdGFQcm9wZXJ0aWVzLkRhdGFiYXNlVXJsLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogaGVhZGVyLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6IGNyZWF0ZUZldGNoQm9keSh0aGlzLmRhdGFQcm9wZXJ0aWVzLkluc2VydFZhbHVlc1F1ZXJ5KSxcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgICAgICAgICAgICAudGhlbihkYXRhID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldENoZWNrZWQodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGZXRjaGVzIHRoZSBsaXN0IG9mIGNoZWNrZWQgdmFsdWVzLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZGIgLSBkYXRhYmFzZSBuYW1lXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYnVzZXIgLSBkYXRhYmFzZSB1c2VyXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYlRhYmxlIC0gZGF0YWJhc2UgdGFibGVcclxuICogQHBhcmFtIHtzdHJpbmd9IGlkRmllbGQgLSBpZGVudGlmaWVyIGZpZWxkXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPGFueT59IC0gYSBwcm9taXNlIG9mIHRoZSByZWNlaXZlZCBqc29uIGxpc3QgXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBmZXRjaFNlbGVjdENoZWNrZWRWYWx1ZXMoZGIsIGRidXNlciwgZGJUYWJsZSwgaWRGaWVsZCkge1xyXG4gICAgcmV0dXJuIGZldGNoKGRhdGFiYXNlVXJsKGRiLCBkYnVzZXIpLCB7XHJcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICBoZWFkZXJzOiBoZWFkZXIsXHJcbiAgICAgICAgICAgIGJvZHk6IGNyZWF0ZUZldGNoQm9keShzZWxlY3RDaGVja2VkRm9yQWxsLmJpbmQodGhpcywgZGJUYWJsZSwgaWRGaWVsZCkpLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gKHJlc3BvbnNlLmpzb24oKSkpXHJcbiAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgIH0pO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBmZXRjaENyZWF0ZVRhYmxlSWZOb3RFeGlzdHMoZGIsIGRidXNlciwgZGJUYWJsZSkge1xyXG4gICAgcmV0dXJuIGZldGNoKGRhdGFiYXNlVXJsKGRiLCBkYnVzZXIpLCB7XHJcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICBoZWFkZXJzOiBoZWFkZXIsXHJcbiAgICAgICAgICAgIGJvZHk6IGNyZWF0ZUZldGNoQm9keShjcmVhdGVUYWJsZVF1ZXJ5LmJpbmQodGhpcywgZGJUYWJsZSkpLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gKHJlc3BvbnNlLmpzb24oKSkpXHJcbiAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgIH0pO1xyXG59XHJcblxyXG4vLyBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ21hcmstaW5wdXQnLCBNYXJrSW5wdXQpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBNYXJrSW5wdXQsXHJcbiAgICBmZXRjaFNlbGVjdENoZWNrZWRWYWx1ZXMsXHJcbiAgICBmZXRjaENyZWF0ZVRhYmxlSWZOb3RFeGlzdHMsXHJcbn07IiwibGV0IHdjR3JpZFRhYmxlID0gcmVxdWlyZShcIndjLWdyaWQtdGFibGUvc3JjL3djLWdyaWQtdGFibGUuanNcIik7XHJcbmxldCBkZWJvdW5jZSA9IHJlcXVpcmUoJ2xvZGFzaC5kZWJvdW5jZScpO1xyXG5sZXQgeyBNYXJrSW5wdXQsIGZldGNoU2VsZWN0Q2hlY2tlZFZhbHVlcywgZmV0Y2hDcmVhdGVUYWJsZUlmTm90RXhpc3RzIH0gPSByZXF1aXJlKFwiLi9NYXJrSW5wdXRcIik7XHJcblxyXG5yZXF1aXJlKCcuL3N0eWxlLmNzcycpO1xyXG4vLyB3Y0dyaWRUYWJsZS5kZWZpbmVDdXN0b21FbGVtZW50KClcclxuXHJcbmNsYXNzIFByb3RUYWJsZSBleHRlbmRzIHdjR3JpZFRhYmxlLlRhYmxlQ29tcG9uZW50IHtcclxuICAgIHVzZURlZmF1bHRPcHRpb25zKCkge1xyXG4gICAgICAgIHN1cGVyLnVzZURlZmF1bHRPcHRpb25zKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xyXG4gICAgICAgIHN1cGVyLmNvbm5lY3RlZENhbGxiYWNrKCk7XHJcblxyXG4gICAgICAgIGxldCBoZWlnaHQgPSB0aGlzLmdldEF0dHJpYnV0ZSgnaGVpZ2h0Jyk7XHJcbiAgICAgICAgbGV0IHBhZ2VTaXplID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3BhZ2Utc2l6ZScpO1xyXG5cclxuICAgICAgICBpZiAoaGVpZ2h0KSB0aGlzLnN0eWxlLm1heEhlaWdodCA9IGhlaWdodDtcclxuICAgICAgICBpZiAocGFnZVNpemUpIHtcclxuICAgICAgICAgICAgLy8gdGhpcy5wYWdpbmF0aW9uLnBhZ2VTaXplID0gTnVtYmVyLnBhcnNlSW50KHBhZ2VTaXplKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5vcHRpb25zLnBhZ2luYXRpb24ucGFnZVNpemUgPSBwYWdlU2l6ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnBhZ2luYXRpb24ucGFnZVNpemUgPSA1MDA7XHJcbiAgICAgICAgICAgIC8vIHRoaXMub3B0aW9ucy5wYWdpbmF0aW9uLnBhZ2VTaXplID0gNTAwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHRhYnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdkaXYudGFicyBkaXYudGFiLXBhbmUnKTtcclxuICAgICAgICBbLi4udGFic10uZm9yRWFjaCgodGFiKSA9PiB7XHJcbiAgICAgICAgICAgIHRhYi5hZGRDbGFzcyA9IG5ldyBQcm94eSh0YWIuYWRkQ2xhc3MsIHtcclxuICAgICAgICAgICAgICAgIGFwcGx5OiBmdW5jdGlvbih0YXJnZXQsIHRoaXNBcmcsIGFyZ0xpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYWRkQ2xhc3MgZml4LWNvbHVtbnMnKTtcclxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnZml4LWNvbHVtbnMnIH0pLCAnKicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQuYXBwbHkodGhpc0FyZywgYXJnTGlzdCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgLy8gZmV0Y2goJ2h0dHA6Ly8xMC4xOS4yOC45NDo1OTg1L2FuZ19wcm90LXdpa2kvcHJvdC13aWtpX0xlZ2VuZGUnKVxyXG4gICAgICAgIGZldGNoKCdodHRwczovL2RhdGFiYXNlLnByb3Ryb25pYy1nbWJoLmRlL3F1ZXJ5P2RhdGFiYXNlPWZvcm1seScsIHtcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBib2R5OiBge1wicXVlcnlcIjogXCJTRUxFQ1QgW3N5bm9ueW1dLCBbbGlua10sIFt0b29sdGlwXSBGUk9NIHNjaGVtYUF1c2t1bmZ0TGlua3M7XCJ9YFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBmb3JtYXR0ZXJSZXN1bHQgPSB7fTtcclxuICAgICAgICAgICAgICAgIGxldCBsaW5rcyA9IHJlc3BvbnNlLm1hcChlbnRyeSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0VudHJ5ID0ge31cclxuICAgICAgICAgICAgICAgICAgICBuZXdFbnRyeVtlbnRyeS5zeW5vbnltXSA9IGVudHJ5Lmxpbms7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ld0VudHJ5O1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBsaW5rcy5mb3JFYWNoKGxpbmsgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGxpbmspLmZvckVhY2goa2V5ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0IHRtcCA9IGxpbmtba2V5XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmb3JtYXR0ZXJSZXN1bHRba2V5XSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVyUmVzdWx0W2tleV0gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXR0ZXJSZXN1bHRba2V5XS5wdXNoKCh2YWx1ZSkgPT4gKHZhbHVlLnN0YXJ0c1dpdGgoJzwnKSA/IHZhbHVlIDogYDxhIGhyZWY9XCIke2xpbmtba2V5XX0ke3ZhbHVlfVwiPiR7dmFsdWV9PC9hPmApKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZm9ybWF0dGVyUmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZm9ybWF0dGVyID0gZm9ybWF0dGVyUmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXR1cFByb3RUYWJsZURhdGEoKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNhdWdodC5cIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldHVwUHJvdFRhYmxlRGF0YSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbG9hZERhdGFGcm9tUXVlcnkocXVlcnkpIHtcclxuICAgICAgICBxdWVyeSA9IGRlY29kZVVSSUNvbXBvbmVudChxdWVyeS5yZXBsYWNlKC9cXFxcbi9nLCAnXFxuJykpO1xyXG5cclxuICAgICAgICBsZXQgZmV0Y2hPcHRpb25zID0ge1xyXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgcXVlcnk6IHF1ZXJ5IH0pXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZmV0Y2goJ2h0dHBzOi8vZGF0YWJhc2UucHJvdHJvbmljLWdtYmguZGUvcXVlcnk/ZGF0YWJhc2U9T0xSZXdlQWJmJywgZmV0Y2hPcHRpb25zKVxyXG4gICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgICAgICAgIC50aGVuKGpzb25SZXNwID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGpzb25SZXNwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dXBNYXJrSW5wdXRzKGpzb25SZXNwKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKG1hcmtEYXRhID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFya0RhdGEuZm9yRWFjaCh2ID0+IGRlbGV0ZSB2LlJPV1NUQVQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldERhdGEobWFya0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzZXR1cFByb3RUYWJsZURhdGEoKSB7XHJcblxyXG4gICAgICAgIGxldCBqc29uVXJsID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGFfdXJsJyk7XHJcbiAgICAgICAganNvblVybCA9IGpzb25VcmwucmVwbGFjZSgvXlthLXpBLVpdKjpcXC9cXC9bYS16QS1aMC05Li1dKi8sICcnKTtcclxuICAgICAgICBsZXQgcXVlcnkgPSB0aGlzLmdldEF0dHJpYnV0ZSgncXVlcnknKTtcclxuXHJcbiAgICAgICAgaWYgKGpzb25VcmwpIHtcclxuICAgICAgICAgICAgZmV0Y2goanNvblVybClcclxuICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4gZGF0YS5qc29uKCkpXHJcbiAgICAgICAgICAgICAgICAudGhlbihkYXRhID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHVwTWFya0lucHV0cyhkYXRhKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihtYXJrRGF0YSA9PiB0aGlzLnNldERhdGEobWFya0RhdGEpKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocXVlcnkpIHtcclxuICAgICAgICAgICAgbG9hZERhdGFGcm9tUXVlcnkocXVlcnkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zZXREZWJvdW5jZUZuKGRlYm91bmNlLCBbMjAwLCB7IGxlYWRpbmc6IHRydWUsIHRyYWlsaW5nOiBmYWxzZSB9XSwgWzUwMCwgeyB0cmFpbGluZzogdHJ1ZSwgbGVhZGluZzogZmFsc2UgfV0pXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZXRzIHVwIHRoZSBtYXJrZXIgY29sdW1uLCBidXQgb25seSB3aGVuIGFsbCBvZiB0aGUgcmVxdWlyZWQgYXR0cmlidXRlcyBleGlzdC5cclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gdGFibGUgZGF0YVxyXG4gICAgICogQHJldHVybnMge29iamVjdH0gLSB0YWJsZSBkYXRhXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHNldHVwTWFya0lucHV0cyhkYXRhKSB7XHJcbiAgICAgICAgY29uc3QgcmVxdWlyZWRBdHRyaWJ1dGVzID0ge1xyXG4gICAgICAgICAgICBpZGVudGlmaWVyRmllbGQ6IHRoaXMuZ2V0QXR0cmlidXRlKCdtYXJrZXItaWRlbnRpZmllcmZpZWxkJyksXHJcbiAgICAgICAgICAgIGRhdGFiYXNlVGFibGU6IHRoaXMuZ2V0QXR0cmlidXRlKCdtYXJrZXItZGF0YWJhc2V0YWJsZScpLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IG9wdGlvbmFsQXR0cmlidXRlcyA9IHtcclxuICAgICAgICAgICAgZGF0YWJhc2U6IHRoaXMuZ2V0QXR0cmlidXRlKCdtYXJrZXItZGF0YWJhc2UnKSA/IHRoaXMuZ2V0QXR0cmlidXRlKCdtYXJrZXItZGF0YWJhc2UnKSA6IFwiTWFya2VyREJcIixcclxuICAgICAgICAgICAgZGF0YWJhc2V1c2VyOiB0aGlzLmdldEF0dHJpYnV0ZSgnbWFya2VyLWRhdGFiYXNldXNlcicpID8gdGhpcy5nZXRBdHRyaWJ1dGUoJ21hcmtlci1kYXRhYmFzZXVzZXInKSA6IFwid2lraVwiLFxyXG4gICAgICAgICAgICBtYXJrZXJUZXh0OiB0aGlzLmdldEF0dHJpYnV0ZSgnbWFya2VyLW1hcmtlcnRleHQnKSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZiAoUmVmbGVjdC5vd25LZXlzKHJlcXVpcmVkQXR0cmlidXRlcykubWFwKChrZXkpID0+IHJlcXVpcmVkQXR0cmlidXRlc1trZXldKS5ldmVyeSgodmFsdWUpID0+ICh2YWx1ZSA9PSB1bmRlZmluZWQgPyBmYWxzZSA6IHRydWUpKSkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgYXdhaXQgZmV0Y2hDcmVhdGVUYWJsZUlmTm90RXhpc3RzKG9wdGlvbmFsQXR0cmlidXRlcy5kYXRhYmFzZSwgb3B0aW9uYWxBdHRyaWJ1dGVzLmRhdGFiYXNldXNlciwgcmVxdWlyZWRBdHRyaWJ1dGVzLmRhdGFiYXNlVGFibGUpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZW5lcmF0ZU1hcmtJbnB1dERhdGEoZGF0YSwgcmVxdWlyZWRBdHRyaWJ1dGVzLCBvcHRpb25hbEF0dHJpYnV0ZXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZXMgYSBNYXJrSW5wdXQgZWxlbWVudC5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZGVudGlmaWVyRmllbGRcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZGVudGlmaWVyVmFsdWVcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0YWJsZW5hbWVcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkYXRhYmFzZVxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRidXNlclxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1hcmtlclxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBjaGVja2VkXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIE1hcmtJbnB1dCBvdXRlciBodG1sXHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZU1hcmtJbnB1dChpZGVudGlmaWVyRmllbGQsIGlkZW50aWZpZXJWYWx1ZSwgdGFibGVuYW1lLCBkYXRhYmFzZSwgZGJ1c2VyLCBtYXJrZXIsIGNoZWNrZWQpIHtcclxuICAgICAgICBsZXQgbWFya0lucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbWFyay1pbnB1dCcpO1xyXG4gICAgICAgIG1hcmtJbnB1dC5zZXRBdHRyaWJ1dGUoJ2lkZW50aWZpZXJmaWVsZCcsIGlkZW50aWZpZXJGaWVsZCk7XHJcbiAgICAgICAgbWFya0lucHV0LnNldEF0dHJpYnV0ZSgnaWRlbnRpZmllcnZhbHVlJywgaWRlbnRpZmllclZhbHVlKTtcclxuICAgICAgICBpZiAodGFibGVuYW1lKSBtYXJrSW5wdXQuc2V0QXR0cmlidXRlKCdkYXRhYmFzZXRhYmxlJywgdGFibGVuYW1lKTtcclxuICAgICAgICBpZiAoZGF0YWJhc2UpIG1hcmtJbnB1dC5zZXRBdHRyaWJ1dGUoJ2RhdGFiYXNlJywgZGF0YWJhc2UpO1xyXG4gICAgICAgIGlmIChkYnVzZXIpIG1hcmtJbnB1dC5zZXRBdHRyaWJ1dGUoJ2RhdGFiYXNldXNlcicsIGRidXNlcik7XHJcbiAgICAgICAgaWYgKG1hcmtlcikgbWFya0lucHV0LnNldEF0dHJpYnV0ZSgnbWFya2VydGV4dCcsIG1hcmtlcik7XHJcbiAgICAgICAgaWYgKGNoZWNrZWQpIG1hcmtJbnB1dC50b2dnbGVBdHRyaWJ1dGUoJ2NoZWNrZWQnLCBjaGVja2VkKTtcclxuICAgICAgICByZXR1cm4gbWFya0lucHV0Lm91dGVySFRNTDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdlbmVyYXRlcyB0aGUgZGF0YSBmb3IgdGhlIHRhYmxlLCB3aGljaCBpbmNsdWRlcyBhIHJvdyB3aXRoIE1hcmtlcklucHV0cy5cclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gdGFibGUgZGF0YVxyXG4gICAgICogQHBhcmFtIHt7aWRlbnRpZmllckZpZWxkOiBzdHJpbmcsIGRhdGFiYXNlVGFibGU6IHN0cmluZ319IHJlcUF0dHIgLSByZXF1aXJlZCBNYXJrSW5wdXQgYXR0cmlidXRlc1xyXG4gICAgICogQHBhcmFtIHt7ZGF0YWJhc2U/OiBzdHJpbmcsIGRhdGFiYXNldXNlcj86IHN0cmluZywgbWFya2VyVGV4dD86IHN0cmluZ319IG9wdEF0dHIgLSBvcHRpb25hbCBNYXJrSW5wdXQgYXR0cmlidXRlc1xyXG4gICAgICogQHJldHVybnMge29iamVjdH0gLSB0YWJsZSBkYXRhXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGdlbmVyYXRlTWFya0lucHV0RGF0YShkYXRhLCByZXFBdHRyLCBvcHRBdHRyKSB7XHJcbiAgICAgICAgbGV0IHsgaWRlbnRpZmllckZpZWxkLCBkYXRhYmFzZVRhYmxlIH0gPSByZXFBdHRyO1xyXG4gICAgICAgIGxldCB7IGRhdGFiYXNlLCBkYXRhYmFzZXVzZXIsIG1hcmtlclRleHQgfSA9IG9wdEF0dHI7XHJcblxyXG4gICAgICAgIC8vIGRhdGFiYXNlVGFibGUgPSBkYXRhYmFzZVRhYmxlID8gZGF0YWJhc2VUYWJsZSA6IFwiRGVmYXVsdFRhYmxlXCI7XHJcbiAgICAgICAgLy8gbWFya2VyVGV4dCA9IG1hcmtlclRleHQgPyBtYXJrZXJUZXh0IDogXCJqamp8bm5uXCI7XHJcblxyXG4gICAgICAgIHJldHVybiBmZXRjaFNlbGVjdENoZWNrZWRWYWx1ZXMoZGF0YWJhc2UsIGRhdGFiYXNldXNlciwgZGF0YWJhc2VUYWJsZSwgaWRlbnRpZmllckZpZWxkKVxyXG4gICAgICAgICAgICAudGhlbigoY2hlY2tlZERhdGEpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhLm1hcCgoZW50cnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY2hlY2tlZCA9IGNoZWNrZWREYXRhLm1hcCgodmFsdWUpID0+IHZhbHVlLmlkZW50aWZpZXJWYWx1ZSkuaW5jbHVkZXMoZW50cnlbaWRlbnRpZmllckZpZWxkXS50b1N0cmluZygpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJ21hcmtlcic6IHRoaXMuY3JlYXRlTWFya0lucHV0KGlkZW50aWZpZXJGaWVsZCwgZW50cnlbaWRlbnRpZmllckZpZWxkXS50b1N0cmluZygpLCBkYXRhYmFzZVRhYmxlLCBkYXRhYmFzZSwgZGF0YWJhc2V1c2VyLCBtYXJrZXJUZXh0LCBjaGVja2VkKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgJyNtYXJraWVydCc6IGNoZWNrZWQgPyAnamEnIDogJ25laW4nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5lbnRyeSxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ21hcmstaW5wdXQnLCBNYXJrSW5wdXQpO1xyXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3Byb3QtdGFibGUtdjMnLCBQcm90VGFibGUpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBQcm90VGFibGU6IFByb3RUYWJsZSxcclxuICAgIFRhYmxlQ29tcG9uZW50OiB3Y0dyaWRUYWJsZS5UYWJsZUNvbXBvbmVudCxcclxufTsiLCIndXNlIHN0cmljdCc7XG4vLyBGb3IgbW9yZSBpbmZvcm1hdGlvbiBhYm91dCBicm93c2VyIGZpZWxkLCBjaGVjayBvdXQgdGhlIGJyb3dzZXIgZmllbGQgYXQgaHR0cHM6Ly9naXRodWIuY29tL3N1YnN0YWNrL2Jyb3dzZXJpZnktaGFuZGJvb2sjYnJvd3Nlci1maWVsZC5cblxudmFyIHN0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wID0gW107XG5cbnZhciBpbnNlcnRTdHlsZUVsZW1lbnQgPSBmdW5jdGlvbihzdHlsZUVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTtcbiAgICB2YXIgbGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3AgPSBzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcFtzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5sZW5ndGggLSAxXTtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMuaW5zZXJ0QXQgPSBvcHRpb25zLmluc2VydEF0IHx8ICdib3R0b20nO1xuXG4gICAgaWYgKG9wdGlvbnMuaW5zZXJ0QXQgPT09ICd0b3AnKSB7XG4gICAgICAgIGlmICghbGFzdFN0eWxlRWxlbWVudEluc2VydGVkQXRUb3ApIHtcbiAgICAgICAgICAgIGhlYWQuaW5zZXJ0QmVmb3JlKHN0eWxlRWxlbWVudCwgaGVhZC5maXJzdENoaWxkKTtcbiAgICAgICAgfSBlbHNlIGlmIChsYXN0U3R5bGVFbGVtZW50SW5zZXJ0ZWRBdFRvcC5uZXh0U2libGluZykge1xuICAgICAgICAgICAgaGVhZC5pbnNlcnRCZWZvcmUoc3R5bGVFbGVtZW50LCBsYXN0U3R5bGVFbGVtZW50SW5zZXJ0ZWRBdFRvcC5uZXh0U2libGluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlRWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AucHVzaChzdHlsZUVsZW1lbnQpO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5pbnNlcnRBdCA9PT0gJ2JvdHRvbScpIHtcbiAgICAgICAgaGVhZC5hcHBlbmRDaGlsZChzdHlsZUVsZW1lbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB2YWx1ZSBmb3IgcGFyYW1ldGVyIFxcJ2luc2VydEF0XFwnLiBNdXN0IGJlIFxcJ3RvcFxcJyBvciBcXCdib3R0b21cXCcuJyk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgLy8gQ3JlYXRlIGEgPGxpbms+IHRhZyB3aXRoIG9wdGlvbmFsIGRhdGEgYXR0cmlidXRlc1xuICAgIGNyZWF0ZUxpbms6IGZ1bmN0aW9uKGhyZWYsIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgdmFyIGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG4gICAgICAgIHZhciBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGluaycpO1xuXG4gICAgICAgIGxpbmsuaHJlZiA9IGhyZWY7XG4gICAgICAgIGxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBpZiAoICEgYXR0cmlidXRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgICAgICBsaW5rLnNldEF0dHJpYnV0ZSgnZGF0YS0nICsga2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBoZWFkLmFwcGVuZENoaWxkKGxpbmspO1xuICAgIH0sXG4gICAgLy8gQ3JlYXRlIGEgPHN0eWxlPiB0YWcgd2l0aCBvcHRpb25hbCBkYXRhIGF0dHJpYnV0ZXNcbiAgICBjcmVhdGVTdHlsZTogZnVuY3Rpb24oY3NzVGV4dCwgYXR0cmlidXRlcywgZXh0cmFPcHRpb25zKSB7XG4gICAgICAgIGV4dHJhT3B0aW9ucyA9IGV4dHJhT3B0aW9ucyB8fCB7fTtcblxuICAgICAgICB2YXIgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgICBzdHlsZS50eXBlID0gJ3RleHQvY3NzJztcblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgICAgICAgICAgaWYgKCAhIGF0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHZhbHVlID0gYXR0cmlidXRlc1trZXldO1xuICAgICAgICAgICAgc3R5bGUuc2V0QXR0cmlidXRlKCdkYXRhLScgKyBrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdHlsZS5zaGVldCkgeyAvLyBmb3IganNkb20gYW5kIElFOStcbiAgICAgICAgICAgIHN0eWxlLmlubmVySFRNTCA9IGNzc1RleHQ7XG4gICAgICAgICAgICBzdHlsZS5zaGVldC5jc3NUZXh0ID0gY3NzVGV4dDtcbiAgICAgICAgICAgIGluc2VydFN0eWxlRWxlbWVudChzdHlsZSwgeyBpbnNlcnRBdDogZXh0cmFPcHRpb25zLmluc2VydEF0IH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHsgLy8gZm9yIElFOCBhbmQgYmVsb3dcbiAgICAgICAgICAgIGluc2VydFN0eWxlRWxlbWVudChzdHlsZSwgeyBpbnNlcnRBdDogZXh0cmFPcHRpb25zLmluc2VydEF0IH0pO1xuICAgICAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzVGV4dDtcbiAgICAgICAgfSBlbHNlIHsgLy8gZm9yIENocm9tZSwgRmlyZWZveCwgYW5kIFNhZmFyaVxuICAgICAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzVGV4dCkpO1xuICAgICAgICAgICAgaW5zZXJ0U3R5bGVFbGVtZW50KHN0eWxlLCB7IGluc2VydEF0OiBleHRyYU9wdGlvbnMuaW5zZXJ0QXQgfSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiLyoqXG4gKiBsb2Rhc2ggKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAqIENvcHlyaWdodCBqUXVlcnkgRm91bmRhdGlvbiBhbmQgb3RoZXIgY29udHJpYnV0b3JzIDxodHRwczovL2pxdWVyeS5vcmcvPlxuICogUmVsZWFzZWQgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICovXG5cbi8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXG52YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xuXG4vKiogVXNlZCBhcyByZWZlcmVuY2VzIGZvciB2YXJpb3VzIGBOdW1iZXJgIGNvbnN0YW50cy4gKi9cbnZhciBOQU4gPSAwIC8gMDtcblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCByZWZlcmVuY2VzLiAqL1xudmFyIHN5bWJvbFRhZyA9ICdbb2JqZWN0IFN5bWJvbF0nO1xuXG4vKiogVXNlZCB0byBtYXRjaCBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLiAqL1xudmFyIHJlVHJpbSA9IC9eXFxzK3xcXHMrJC9nO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgYmFkIHNpZ25lZCBoZXhhZGVjaW1hbCBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNCYWRIZXggPSAvXlstK10weFswLTlhLWZdKyQvaTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGJpbmFyeSBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNCaW5hcnkgPSAvXjBiWzAxXSskL2k7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBvY3RhbCBzdHJpbmcgdmFsdWVzLiAqL1xudmFyIHJlSXNPY3RhbCA9IC9eMG9bMC03XSskL2k7XG5cbi8qKiBCdWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcyB3aXRob3V0IGEgZGVwZW5kZW5jeSBvbiBgcm9vdGAuICovXG52YXIgZnJlZVBhcnNlSW50ID0gcGFyc2VJbnQ7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZ2xvYmFsYCBmcm9tIE5vZGUuanMuICovXG52YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsICYmIGdsb2JhbC5PYmplY3QgPT09IE9iamVjdCAmJiBnbG9iYWw7XG5cbi8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgc2VsZmAuICovXG52YXIgZnJlZVNlbGYgPSB0eXBlb2Ygc2VsZiA9PSAnb2JqZWN0JyAmJiBzZWxmICYmIHNlbGYuT2JqZWN0ID09PSBPYmplY3QgJiYgc2VsZjtcblxuLyoqIFVzZWQgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QuICovXG52YXIgcm9vdCA9IGZyZWVHbG9iYWwgfHwgZnJlZVNlbGYgfHwgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblxuLyoqIFVzZWQgZm9yIGJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzLiAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlXG4gKiBbYHRvU3RyaW5nVGFnYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNy4wLyNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIG9mIHZhbHVlcy5cbiAqL1xudmFyIG9iamVjdFRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qIEJ1aWx0LWluIG1ldGhvZCByZWZlcmVuY2VzIGZvciB0aG9zZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcy4gKi9cbnZhciBuYXRpdmVNYXggPSBNYXRoLm1heCxcbiAgICBuYXRpdmVNaW4gPSBNYXRoLm1pbjtcblxuLyoqXG4gKiBHZXRzIHRoZSB0aW1lc3RhbXAgb2YgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2VcbiAqIHRoZSBVbml4IGVwb2NoICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMi40LjBcbiAqIEBjYXRlZ29yeSBEYXRlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBSZXR1cm5zIHRoZSB0aW1lc3RhbXAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uZGVmZXIoZnVuY3Rpb24oc3RhbXApIHtcbiAqICAgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTtcbiAqIH0sIF8ubm93KCkpO1xuICogLy8gPT4gTG9ncyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBpdCB0b29rIGZvciB0aGUgZGVmZXJyZWQgaW52b2NhdGlvbi5cbiAqL1xudmFyIG5vdyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gcm9vdC5EYXRlLm5vdygpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZGVib3VuY2VkIGZ1bmN0aW9uIHRoYXQgZGVsYXlzIGludm9raW5nIGBmdW5jYCB1bnRpbCBhZnRlciBgd2FpdGBcbiAqIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdhc1xuICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxuICogZGVsYXllZCBgZnVuY2AgaW52b2NhdGlvbnMgYW5kIGEgYGZsdXNoYCBtZXRob2QgdG8gaW1tZWRpYXRlbHkgaW52b2tlIHRoZW0uXG4gKiBQcm92aWRlIGBvcHRpb25zYCB0byBpbmRpY2F0ZSB3aGV0aGVyIGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGVcbiAqIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LiBUaGUgYGZ1bmNgIGlzIGludm9rZWRcbiAqIHdpdGggdGhlIGxhc3QgYXJndW1lbnRzIHByb3ZpZGVkIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24uIFN1YnNlcXVlbnRcbiAqIGNhbGxzIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgXG4gKiBpbnZvY2F0aW9uLlxuICpcbiAqICoqTm90ZToqKiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgLCBgZnVuY2AgaXNcbiAqIGludm9rZWQgb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uXG4gKiBpcyBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gKlxuICogSWYgYHdhaXRgIGlzIGAwYCBhbmQgYGxlYWRpbmdgIGlzIGBmYWxzZWAsIGBmdW5jYCBpbnZvY2F0aW9uIGlzIGRlZmVycmVkXG4gKiB1bnRpbCB0byB0aGUgbmV4dCB0aWNrLCBzaW1pbGFyIHRvIGBzZXRUaW1lb3V0YCB3aXRoIGEgdGltZW91dCBvZiBgMGAuXG4gKlxuICogU2VlIFtEYXZpZCBDb3JiYWNobydzIGFydGljbGVdKGh0dHBzOi8vY3NzLXRyaWNrcy5jb20vZGVib3VuY2luZy10aHJvdHRsaW5nLWV4cGxhaW5lZC1leGFtcGxlcy8pXG4gKiBmb3IgZGV0YWlscyBvdmVyIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIGBfLmRlYm91bmNlYCBhbmQgYF8udGhyb3R0bGVgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC4xLjBcbiAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIFRoZSBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF1cbiAqICBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlIGRlbGF5ZWQgYmVmb3JlIGl0J3MgaW52b2tlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV1cbiAqICBTcGVjaWZ5IGludm9raW5nIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBBdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4LlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApKTtcbiAqXG4gKiAvLyBJbnZva2UgYHNlbmRNYWlsYCB3aGVuIGNsaWNrZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxscy5cbiAqIGpRdWVyeShlbGVtZW50KS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAqICAgJ2xlYWRpbmcnOiB0cnVlLFxuICogICAndHJhaWxpbmcnOiBmYWxzZVxuICogfSkpO1xuICpcbiAqIC8vIEVuc3VyZSBgYmF0Y2hMb2dgIGlzIGludm9rZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHMuXG4gKiB2YXIgZGVib3VuY2VkID0gXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7ICdtYXhXYWl0JzogMTAwMCB9KTtcbiAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAqIGpRdWVyeShzb3VyY2UpLm9uKCdtZXNzYWdlJywgZGVib3VuY2VkKTtcbiAqXG4gKiAvLyBDYW5jZWwgdGhlIHRyYWlsaW5nIGRlYm91bmNlZCBpbnZvY2F0aW9uLlxuICogalF1ZXJ5KHdpbmRvdykub24oJ3BvcHN0YXRlJywgZGVib3VuY2VkLmNhbmNlbCk7XG4gKi9cbmZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgdmFyIGxhc3RBcmdzLFxuICAgICAgbGFzdFRoaXMsXG4gICAgICBtYXhXYWl0LFxuICAgICAgcmVzdWx0LFxuICAgICAgdGltZXJJZCxcbiAgICAgIGxhc3RDYWxsVGltZSxcbiAgICAgIGxhc3RJbnZva2VUaW1lID0gMCxcbiAgICAgIGxlYWRpbmcgPSBmYWxzZSxcbiAgICAgIG1heGluZyA9IGZhbHNlLFxuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICB9XG4gIHdhaXQgPSB0b051bWJlcih3YWl0KSB8fCAwO1xuICBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XG4gICAgbWF4aW5nID0gJ21heFdhaXQnIGluIG9wdGlvbnM7XG4gICAgbWF4V2FpdCA9IG1heGluZyA/IG5hdGl2ZU1heCh0b051bWJlcihvcHRpb25zLm1heFdhaXQpIHx8IDAsIHdhaXQpIDogbWF4V2FpdDtcbiAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICB9XG5cbiAgZnVuY3Rpb24gaW52b2tlRnVuYyh0aW1lKSB7XG4gICAgdmFyIGFyZ3MgPSBsYXN0QXJncyxcbiAgICAgICAgdGhpc0FyZyA9IGxhc3RUaGlzO1xuXG4gICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICBsYXN0SW52b2tlVGltZSA9IHRpbWU7XG4gICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gbGVhZGluZ0VkZ2UodGltZSkge1xuICAgIC8vIFJlc2V0IGFueSBgbWF4V2FpdGAgdGltZXIuXG4gICAgbGFzdEludm9rZVRpbWUgPSB0aW1lO1xuICAgIC8vIFN0YXJ0IHRoZSB0aW1lciBmb3IgdGhlIHRyYWlsaW5nIGVkZ2UuXG4gICAgdGltZXJJZCA9IHNldFRpbWVvdXQodGltZXJFeHBpcmVkLCB3YWl0KTtcbiAgICAvLyBJbnZva2UgdGhlIGxlYWRpbmcgZWRnZS5cbiAgICByZXR1cm4gbGVhZGluZyA/IGludm9rZUZ1bmModGltZSkgOiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiByZW1haW5pbmdXYWl0KHRpbWUpIHtcbiAgICB2YXIgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lLFxuICAgICAgICB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lLFxuICAgICAgICByZXN1bHQgPSB3YWl0IC0gdGltZVNpbmNlTGFzdENhbGw7XG5cbiAgICByZXR1cm4gbWF4aW5nID8gbmF0aXZlTWluKHJlc3VsdCwgbWF4V2FpdCAtIHRpbWVTaW5jZUxhc3RJbnZva2UpIDogcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gc2hvdWxkSW52b2tlKHRpbWUpIHtcbiAgICB2YXIgdGltZVNpbmNlTGFzdENhbGwgPSB0aW1lIC0gbGFzdENhbGxUaW1lLFxuICAgICAgICB0aW1lU2luY2VMYXN0SW52b2tlID0gdGltZSAtIGxhc3RJbnZva2VUaW1lO1xuXG4gICAgLy8gRWl0aGVyIHRoaXMgaXMgdGhlIGZpcnN0IGNhbGwsIGFjdGl2aXR5IGhhcyBzdG9wcGVkIGFuZCB3ZSdyZSBhdCB0aGVcbiAgICAvLyB0cmFpbGluZyBlZGdlLCB0aGUgc3lzdGVtIHRpbWUgaGFzIGdvbmUgYmFja3dhcmRzIGFuZCB3ZSdyZSB0cmVhdGluZ1xuICAgIC8vIGl0IGFzIHRoZSB0cmFpbGluZyBlZGdlLCBvciB3ZSd2ZSBoaXQgdGhlIGBtYXhXYWl0YCBsaW1pdC5cbiAgICByZXR1cm4gKGxhc3RDYWxsVGltZSA9PT0gdW5kZWZpbmVkIHx8ICh0aW1lU2luY2VMYXN0Q2FsbCA+PSB3YWl0KSB8fFxuICAgICAgKHRpbWVTaW5jZUxhc3RDYWxsIDwgMCkgfHwgKG1heGluZyAmJiB0aW1lU2luY2VMYXN0SW52b2tlID49IG1heFdhaXQpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRpbWVyRXhwaXJlZCgpIHtcbiAgICB2YXIgdGltZSA9IG5vdygpO1xuICAgIGlmIChzaG91bGRJbnZva2UodGltZSkpIHtcbiAgICAgIHJldHVybiB0cmFpbGluZ0VkZ2UodGltZSk7XG4gICAgfVxuICAgIC8vIFJlc3RhcnQgdGhlIHRpbWVyLlxuICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgcmVtYWluaW5nV2FpdCh0aW1lKSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmFpbGluZ0VkZ2UodGltZSkge1xuICAgIHRpbWVySWQgPSB1bmRlZmluZWQ7XG5cbiAgICAvLyBPbmx5IGludm9rZSBpZiB3ZSBoYXZlIGBsYXN0QXJnc2Agd2hpY2ggbWVhbnMgYGZ1bmNgIGhhcyBiZWVuXG4gICAgLy8gZGVib3VuY2VkIGF0IGxlYXN0IG9uY2UuXG4gICAgaWYgKHRyYWlsaW5nICYmIGxhc3RBcmdzKSB7XG4gICAgICByZXR1cm4gaW52b2tlRnVuYyh0aW1lKTtcbiAgICB9XG4gICAgbGFzdEFyZ3MgPSBsYXN0VGhpcyA9IHVuZGVmaW5lZDtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gY2FuY2VsKCkge1xuICAgIGlmICh0aW1lcklkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcklkKTtcbiAgICB9XG4gICAgbGFzdEludm9rZVRpbWUgPSAwO1xuICAgIGxhc3RBcmdzID0gbGFzdENhbGxUaW1lID0gbGFzdFRoaXMgPSB0aW1lcklkID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgcmV0dXJuIHRpbWVySWQgPT09IHVuZGVmaW5lZCA/IHJlc3VsdCA6IHRyYWlsaW5nRWRnZShub3coKSk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWJvdW5jZWQoKSB7XG4gICAgdmFyIHRpbWUgPSBub3coKSxcbiAgICAgICAgaXNJbnZva2luZyA9IHNob3VsZEludm9rZSh0aW1lKTtcblxuICAgIGxhc3RBcmdzID0gYXJndW1lbnRzO1xuICAgIGxhc3RUaGlzID0gdGhpcztcbiAgICBsYXN0Q2FsbFRpbWUgPSB0aW1lO1xuXG4gICAgaWYgKGlzSW52b2tpbmcpIHtcbiAgICAgIGlmICh0aW1lcklkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGxlYWRpbmdFZGdlKGxhc3RDYWxsVGltZSk7XG4gICAgICB9XG4gICAgICBpZiAobWF4aW5nKSB7XG4gICAgICAgIC8vIEhhbmRsZSBpbnZvY2F0aW9ucyBpbiBhIHRpZ2h0IGxvb3AuXG4gICAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdCk7XG4gICAgICAgIHJldHVybiBpbnZva2VGdW5jKGxhc3RDYWxsVGltZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aW1lcklkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRpbWVySWQgPSBzZXRUaW1lb3V0KHRpbWVyRXhwaXJlZCwgd2FpdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZGVib3VuY2VkLmNhbmNlbCA9IGNhbmNlbDtcbiAgZGVib3VuY2VkLmZsdXNoID0gZmx1c2g7XG4gIHJldHVybiBkZWJvdW5jZWQ7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlXG4gKiBbbGFuZ3VhZ2UgdHlwZV0oaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzcuMC8jc2VjLWVjbWFzY3JpcHQtbGFuZ3VhZ2UtdHlwZXMpXG4gKiBvZiBgT2JqZWN0YC4gKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSAwLjEuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KF8ubm9vcCk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChudWxsKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIHZhbHVlO1xuICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLiBBIHZhbHVlIGlzIG9iamVjdC1saWtlIGlmIGl0J3Mgbm90IGBudWxsYFxuICogYW5kIGhhcyBhIGB0eXBlb2ZgIHJlc3VsdCBvZiBcIm9iamVjdFwiLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIG9iamVjdC1saWtlLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0TGlrZShbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKF8ubm9vcCk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKG51bGwpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3RMaWtlKHZhbHVlKSB7XG4gIHJldHVybiAhIXZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBjbGFzc2lmaWVkIGFzIGEgYFN5bWJvbGAgcHJpbWl0aXZlIG9yIG9iamVjdC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHNpbmNlIDQuMC4wXG4gKiBAY2F0ZWdvcnkgTGFuZ1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYHZhbHVlYCBpcyBhIHN5bWJvbCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzU3ltYm9sKFN5bWJvbC5pdGVyYXRvcik7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc1N5bWJvbCgnYWJjJyk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N5bWJvbCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdzeW1ib2wnIHx8XG4gICAgKGlzT2JqZWN0TGlrZSh2YWx1ZSkgJiYgb2JqZWN0VG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT0gc3ltYm9sVGFnKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBgdmFsdWVgIHRvIGEgbnVtYmVyLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgNC4wLjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBwcm9jZXNzLlxuICogQHJldHVybnMge251bWJlcn0gUmV0dXJucyB0aGUgbnVtYmVyLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLnRvTnVtYmVyKDMuMik7XG4gKiAvLyA9PiAzLjJcbiAqXG4gKiBfLnRvTnVtYmVyKE51bWJlci5NSU5fVkFMVUUpO1xuICogLy8gPT4gNWUtMzI0XG4gKlxuICogXy50b051bWJlcihJbmZpbml0eSk7XG4gKiAvLyA9PiBJbmZpbml0eVxuICpcbiAqIF8udG9OdW1iZXIoJzMuMicpO1xuICogLy8gPT4gMy4yXG4gKi9cbmZ1bmN0aW9uIHRvTnVtYmVyKHZhbHVlKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT0gJ251bWJlcicpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKGlzU3ltYm9sKHZhbHVlKSkge1xuICAgIHJldHVybiBOQU47XG4gIH1cbiAgaWYgKGlzT2JqZWN0KHZhbHVlKSkge1xuICAgIHZhciBvdGhlciA9IHR5cGVvZiB2YWx1ZS52YWx1ZU9mID09ICdmdW5jdGlvbicgPyB2YWx1ZS52YWx1ZU9mKCkgOiB2YWx1ZTtcbiAgICB2YWx1ZSA9IGlzT2JqZWN0KG90aGVyKSA/IChvdGhlciArICcnKSA6IG90aGVyO1xuICB9XG4gIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gdmFsdWUgPT09IDAgPyB2YWx1ZSA6ICt2YWx1ZTtcbiAgfVxuICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UocmVUcmltLCAnJyk7XG4gIHZhciBpc0JpbmFyeSA9IHJlSXNCaW5hcnkudGVzdCh2YWx1ZSk7XG4gIHJldHVybiAoaXNCaW5hcnkgfHwgcmVJc09jdGFsLnRlc3QodmFsdWUpKVxuICAgID8gZnJlZVBhcnNlSW50KHZhbHVlLnNsaWNlKDIpLCBpc0JpbmFyeSA/IDIgOiA4KVxuICAgIDogKHJlSXNCYWRIZXgudGVzdCh2YWx1ZSkgPyBOQU4gOiArdmFsdWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlO1xuIiwiLyoqXHJcbiAqIFRyYW5zZm9ybSB0aGUgZmlsdGVyIGlucHV0IGludG8gYSBSZWdFeHAsIHRvIGxldCB0aGUgdXNlciBoYXZlIGEgcG93ZXJmdWxsIHdheSB0byBmaWx0ZXIgaW4gdGhlIHRhYmxlLlxyXG4gKiBPbmx5IHJvd3Mgd2hlcmUgdGhlIHRlc3RlZCB2YWx1ZSBtYXRjaGVzIHRoZSBSZWdFeHAsIGdldCBkaXNwbGF5ZWQuIFxyXG4gKiBBZGRpdGlvbmFsbHkgeW91IGNhbiBwcmVwZW5kIHRocmVlIGV4Y2xhbWF0aW9uIG1hcmtzICgnISEhJykgdG8gbmVnYXRlIHRoZSBSZWdFeHAsIHNvIHRoYXQgb25seSByb3dzIHRoYXRcclxuICogZG9uJ3QgbWF0Y2ggdGhlIFJlZ0V4cCBhcmUgZGlzcGxheWVkLiBUaGlzIGlzIHRoZSBkZWZhdWx0IGZpbHRlciBmdW5jdGlvbi5cclxuICogVGhpcyBmdW5jdGlvbiBjYW4gYmUgcmVwbGFjZWQgYnkgc3VwcGx5aW5nIHlvdXIgb3duIGZ1bmN0aW9ucyB0byBUYWJsZUNvbXBvbmVudC5maWx0ZXJPcGVyYXRpb25zLlxyXG4gKiBcclxuICogQHBhcmFtIHtzdHJpbmd9IGZpbHRlcklucHV0IHRoZSB2YWx1ZSBvZiB0aGUgZmlsdGVyIHRleHQgaW5wdXQgZmllbGQuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXN0VmFsdWUgdGhlIHRhYmxlIHZhbHVlIHRvIHZhbGlkYXRlIGFnYWluc3QuXHJcbiAqL1xyXG5mdW5jdGlvbiByZWdleEZpbHRlcihuZWdhdGUsIGZpbHRlcklucHV0LCB0ZXN0VmFsdWUpIHtcclxuICAgIC8vIGxldCBuZWdhdGUgPSBmaWx0ZXJJbnB1dC5zdWJzdHJpbmcoMCwgMykgPT09ICchISEnO1xyXG4gICAgLy8gZmlsdGVySW5wdXQgPSBuZWdhdGUgPyBmaWx0ZXJJbnB1dC5zdWJzdHJpbmcoMykgOiBmaWx0ZXJJbnB1dDtcclxuICAgIGxldCByZXN1bHQgPSBmYWxzZTtcclxuICAgIGlmICh0ZXN0VmFsdWUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgbGV0IG1hdGNoZXMgPSB0ZXN0VmFsdWUudG9TdHJpbmcoKS5tYXRjaChuZXcgUmVnRXhwKGZpbHRlcklucHV0LCAnaScpKTtcclxuICAgICAgICByZXN1bHQgPSBCb29sZWFuKG1hdGNoZXMpICYmIG1hdGNoZXMubGVuZ3RoID4gMDtcclxuICAgIH1cclxuICAgIHJldHVybiBuZWdhdGUgPyAhcmVzdWx0IDogcmVzdWx0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdHJpcEh0bWwoaHRtbCkge1xyXG4gICAgbGV0IGRvYyA9IG5ldyBET01QYXJzZXIoKS5wYXJzZUZyb21TdHJpbmcoaHRtbCwgJ3RleHQvaHRtbCcpO1xyXG4gICAgcmV0dXJuIGRvYy5ib2R5LnRleHRDb250ZW50IHx8IFwiXCI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUZXN0IHRoZSBmaWx0ZXIgaW5wdXQgc3RyaW5nIHdpdGggaW5jbHVkZXMgKGNhc2UgaXMgaWdub3JlZCkgYWdhaW5zdCB0aGUgdGFibGUgdmFsdWUuXHJcbiAqIE9ubHkgcm93cyB3aGVyZSB0aGUgZmlsdGVyIGlucHV0IGlzIGEgc3Vic3RyaW5nIG9mIHRoZSB0ZXN0ZWQgdmFsdWUuXHJcbiAqIEFkZGl0aW9uYWxseSB5b3UgY2FuIHByZXBlbmQgdGhyZWUgZXhjbGFtYXRpb24gbWFya3MgKCchISEnKSB0byBuZWdhdGUgdGhlIG91dGNvbWUsIFxyXG4gKiBzbyB0aGF0IG9ubHkgcm93cyB0aGF0IGFyZSBub3QgaW5jbHVkZWQgaW4gdGhlIHRhYmxlIHZhbHVlIGFyZSBkaXNwbGF5ZWQuXHJcbiAqIFRoaXMgZnVuY3Rpb24gY2FuIHJlcGxhY2UgcmVnZXhGaWx0ZXIgYnkgc3VwcGx5aW5nIGl0IHRvIFRhYmxlQ29tcG9uZW50LmZpbHRlck9wZXJhdGlvbnMgb3Igb3ZlcndyaXRpbmdcclxuICogcmVnZXhGaWx0ZXIgYmVmb3JlIHVzZS5cclxuICogXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWx0ZXJJbnB1dCB0aGUgdmFsdWUgb2YgdGhlIGZpbHRlciB0ZXh0IGlucHV0IGZpZWxkLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gdGVzdFZhbHVlIHRoZSB0YWJsZSB2YWx1ZSB0byB2YWxpZGF0ZSBhZ2FpbnN0LlxyXG4gKi9cclxuZnVuY3Rpb24gdGV4dEZpbHRlcihuZWdhdGUsIGZpbHRlcklucHV0LCB0ZXN0VmFsdWUpIHtcclxuICAgIC8vIGxldCBuZWdhdGUgPSBmaWx0ZXJJbnB1dC5zdWJzdHJpbmcoMCwgMykgPT09ICchISEnO1xyXG4gICAgLy8gZmlsdGVySW5wdXQgPSBuZWdhdGUgPyBmaWx0ZXJJbnB1dC5zdWJzdHJpbmcoMykgOiBmaWx0ZXJJbnB1dDtcclxuICAgIGxldCByZXN1bHQgPSBmYWxzZTtcclxuICAgIGlmICh0ZXN0VmFsdWUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgcmVzdWx0ID0gc3RyaXBIdG1sKHRlc3RWYWx1ZS50b1N0cmluZygpKS50b1VwcGVyQ2FzZSgpLmluY2x1ZGVzKHN0cmlwSHRtbChmaWx0ZXJJbnB1dCkudG9VcHBlckNhc2UoKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmVnYXRlID8gIXJlc3VsdCA6IHJlc3VsdDtcclxufVxyXG5cclxuZnVuY3Rpb24gY29tcGFyZUZpbHRlcihvcGVyYXRpb24sIGZpbHRlcklucHV0LCB0ZXN0VmFsdWUpIHtcclxuICAgIGxldCByZXN1bHQgPSBmYWxzZTtcclxuICAgIGlmICh0ZXN0VmFsdWUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmVzdWx0ID0gb3BlcmF0aW9uKE51bWJlci5wYXJzZUZsb2F0KGZpbHRlcklucHV0KSwgTnVtYmVyLnBhcnNlRmxvYXQodGVzdFZhbHVlKSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IG9wZXJhdGlvbihmaWx0ZXJJbnB1dC50b1N0cmluZygpLCB0ZXN0VmFsdWUudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7IHJlZ2V4RmlsdGVyLCB0ZXh0RmlsdGVyLCBjb21wYXJlRmlsdGVyIH07IiwiZnVuY3Rpb24gZ2V0RnJhbWVTdGFydEVuZChjdXJyZW50UGFnZSwgdG90YWxQYWdlcykge1xyXG4gICAgbGV0IHN0YXJ0ID0gY3VycmVudFBhZ2UgLSAyO1xyXG4gICAgbGV0IGVuZCA9IGN1cnJlbnRQYWdlICsgMjtcclxuXHJcbiAgICBpZiAoY3VycmVudFBhZ2UgPj0gdG90YWxQYWdlcyAtIDEpIHtcclxuICAgICAgICBlbmQgPSB0b3RhbFBhZ2VzO1xyXG4gICAgICAgIHN0YXJ0ID0gdG90YWxQYWdlcyA8IDUgPyAxIDogdG90YWxQYWdlcyAtIDQ7XHJcbiAgICB9IGVsc2UgaWYgKGN1cnJlbnRQYWdlIDw9IDIpIHtcclxuICAgICAgICBlbmQgPSB0b3RhbFBhZ2VzIDwgNSA/IHRvdGFsUGFnZXMgOiA1O1xyXG4gICAgICAgIHN0YXJ0ID0gMTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyBzdGFydDogc3RhcnQsIGVuZDogZW5kIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNoYW5nZVBhZ2VUbyh0YWJsZSwgdGFyZ2V0UGFnZSkge1xyXG4gICAgdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSA9IHRhcmdldFBhZ2U7XHJcbiAgICB0YWJsZS5zZXJpYWxpemVMaW5rT3B0aW9ucygpO1xyXG4gICAgdGFibGUucmVkcmF3RGF0YSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvblBhZ2VDaGFuZ2VLZXkodGFibGUsIGV2ZW50KSB7XHJcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PSAzNykge1xyXG4gICAgICAgIGNoYW5nZVBhZ2VUbyh0YWJsZSwgdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSA+IDEgPyB0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlIC0gMSA6IDEpXHJcbiAgICAgICAgICAgIC8vdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSA9IHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPiAxID8gdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSAtIDEgOiAxO1xyXG4gICAgICAgICAgICAvL3RhYmxlLnJlZHJhd0RhdGEoKTtcclxuICAgIH0gZWxzZSBpZiAoZXZlbnQua2V5Q29kZSA9PSAzOSkge1xyXG4gICAgICAgIGNoYW5nZVBhZ2VUbyh0YWJsZSwgdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSA8IHRhYmxlLnBhZ2luYXRpb24udG90YWxQYWdlcyA/IHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgKyAxIDogdGFibGUucGFnaW5hdGlvbi50b3RhbFBhZ2VzKTtcclxuICAgICAgICAvL3RhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPSB0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlIDwgdGFibGUucGFnaW5hdGlvbi50b3RhbFBhZ2VzID8gdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSArIDEgOiB0YWJsZS5wYWdpbmF0aW9uLnRvdGFsUGFnZXM7XHJcbiAgICAgICAgLy90YWJsZS5yZWRyYXdEYXRhKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsaWNrSGFuZGxlckRvY3VtZW50KHRhYmxlLCBldmVudCkge1xyXG4gICAgbGV0IGtleUNoYW5nZUxpc3RlbmVyID0gb25QYWdlQ2hhbmdlS2V5LmJpbmQobnVsbCwgdGFibGUpO1xyXG5cclxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleXVwJywga2V5Q2hhbmdlTGlzdGVuZXIpO1xyXG5cclxuICAgIGlmICh0YWJsZS5lbGVtZW50cy5wYWdlQ2hvb3NlciA9PSBldmVudC50YXJnZXQgfHwgdGFibGUuZWxlbWVudHMucGFnZUNob29zZXIgPT0gZXZlbnQudGFyZ2V0LnBhcmVudE5vZGUpIHtcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGtleUNoYW5nZUxpc3RlbmVyKTtcclxuICAgICAgICB0YWJsZS5lbGVtZW50cy5wYWdlQ2hvb3Nlci5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAodGFibGUgJiYgdGFibGUuZWxlbWVudHMucGFnZUNob29zZXIpIHRhYmxlLmVsZW1lbnRzLnBhZ2VDaG9vc2VyLmNsYXNzTGlzdC5yZW1vdmUoJ3NlbGVjdGVkJyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmxldCBjbGlja0hhbmRsZXJCb3VuZENhbGwgPSB1bmRlZmluZWQ7XHJcblxyXG5mdW5jdGlvbiBhZGRLZXlIYW5kbGVyVG9Eb2N1bWVudCh0YWJsZSkge1xyXG4gICAgaWYgKCFjbGlja0hhbmRsZXJCb3VuZENhbGwpIGNsaWNrSGFuZGxlckJvdW5kQ2FsbCA9IGNsaWNrSGFuZGxlckRvY3VtZW50LmJpbmQobnVsbCwgdGFibGUpO1xyXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbGlja0hhbmRsZXJCb3VuZENhbGwpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbGlja0hhbmRsZXJCb3VuZENhbGwpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVQYWdlQ2hvb3Nlcih0YWJsZSwgZGF0YSkge1xyXG4gICAgbGV0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIGxldCBjdXJyZW50UGFnZSA9IHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2U7XHJcbiAgICBsZXQgdG90YWxQYWdlcyA9IHRhYmxlLnBhZ2luYXRpb24udG90YWxQYWdlcztcclxuICAgIGlmICh0YWJsZS5wYWdpbmF0aW9uLmFjdGl2ZSkge1xyXG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgncGFnZS1jaG9vc2VyJywgJ3dndC1wYWdpbmF0aW9uJyk7XHJcbiAgICAgICAgbGV0IGZyb250X2Rpc2FibGVkID0gY3VycmVudFBhZ2UgPT0gMVxyXG4gICAgICAgIGxldCBiYWNrX2Rpc2FibGVkID0gY3VycmVudFBhZ2UgPT0gdG90YWxQYWdlcztcclxuICAgICAgICBlbGVtZW50LmFwcGVuZChjcmVhdGVQYWdlQ2hvb3NlckNoaWxkKCc8PCcsIHRhYmxlLCAxLCBmYWxzZSwgZnJvbnRfZGlzYWJsZWQpKTtcclxuICAgICAgICBlbGVtZW50LmFwcGVuZChjcmVhdGVQYWdlQ2hvb3NlckNoaWxkKCc8JywgdGFibGUsIGN1cnJlbnRQYWdlIC0gMSwgZmFsc2UsIGZyb250X2Rpc2FibGVkKSk7XHJcbiAgICAgICAgbGV0IHsgc3RhcnQsIGVuZCB9ID0gZ2V0RnJhbWVTdGFydEVuZChjdXJyZW50UGFnZSwgdG90YWxQYWdlcyk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDw9IGVuZDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50UGFnZSA9PSBpKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZChjcmVhdGVQYWdlQ2hvb3NlckNoaWxkKGkudG9TdHJpbmcoKSwgdGFibGUsIGksIHRydWUpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZVBhZ2VDaG9vc2VyQ2hpbGQoaS50b1N0cmluZygpLCB0YWJsZSwgaSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZVBhZ2VDaG9vc2VyQ2hpbGQoJz4nLCB0YWJsZSwgY3VycmVudFBhZ2UgKyAxLCBmYWxzZSwgYmFja19kaXNhYmxlZCkpO1xyXG4gICAgICAgIGVsZW1lbnQuYXBwZW5kKGNyZWF0ZVBhZ2VDaG9vc2VyQ2hpbGQoJz4+JywgdGFibGUsIHRvdGFsUGFnZXMsIGZhbHNlLCBiYWNrX2Rpc2FibGVkKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZWxlbWVudDtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlUGFnZUNob29zZXJDaGlsZChjb250ZW50LCB0YWJsZSwgdGFyZ2V0UGFnZSwgaXNDdXJyZW50LCBpc0Rpc2FibGVkKSB7XHJcbiAgICBsZXQgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgZWxlbWVudC5pbm5lckhUTUwgPSBjb250ZW50O1xyXG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdwYWdlLWNoYW5nZScsICd3Z3QtcGFnaW5hdGlvbicpO1xyXG4gICAgaWYgKGlzQ3VycmVudCkge1xyXG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnYWN0aXZlLXBhZ2UnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKGlzRGlzYWJsZWQpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdwYWdlLWNoYW5nZS1kaXNhYmxlZCcpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGNoYW5nZVBhZ2VUbyh0YWJsZSwgdGFyZ2V0UGFnZSlcclxuICAgICAgICAgICAgICAgICAgICAvL3RhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPSB0YXJnZXRQYWdlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vdGFibGUucmVkcmF3RGF0YSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZWxlbWVudDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICBnZXRGcmFtZVN0YXJ0RW5kLFxyXG4gICAgY3JlYXRlUGFnZUNob29zZXIsXHJcbiAgICBjcmVhdGVQYWdlQ2hvb3NlckNoaWxkLFxyXG4gICAgYWRkS2V5SGFuZGxlclRvRG9jdW1lbnQsXHJcbiAgICBjaGFuZ2VQYWdlVG8sXHJcbn0iLCJ2YXIgY3NzID0gXCIvKiBib2R5IHtcXHJcXG4gIGZvbnQ6IGFyaWFsLCBzYW5zLXNlcmlmO1xcclxcbn0gKi9cXG4ud2d0LWdyaWQtY29udGFpbmVyIHtcXG4gIGRpc3BsYXk6IGdyaWQ7XFxuICBwb3NpdGlvbjogc3RhdGljO1xcbiAgbWF4LXdpZHRoOiBtaW4tY29udGVudDtcXG4gIG1heC1oZWlnaHQ6IDUwMHB4O1xcbiAgb3ZlcmZsb3cteTogc2Nyb2xsO1xcbiAgYmFja2dyb3VuZDogbGlnaHRncmF5O1xcbiAgLyogZ3JpZC1nYXA6IDFweDsgKi9cXG4gIC8qIGdyaWQtcm93LWdhcDogMnB4OyAqL1xcbiAgZ3JpZC1jb2x1bW4tZ2FwOiAycHg7XFxuICBib3JkZXI6IDFweCBzb2xpZCBsaWdodGdyYXk7XFxufVxcbi5oZWFkZXItY29sLXRvb2x0aXAge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxuICBib3JkZXI6IDFweCBzb2xpZCBsaWdodGdyYXk7XFxuICBib3JkZXItcmlnaHQ6IDFweCBkb3R0ZWQgbGlnaHRncmF5O1xcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxuICB6LWluZGV4OiA5OTtcXG4gIHZpc2liaWxpdHk6IGhpZGRlbjtcXG4gIG1hcmdpbjogLTFweDtcXG59XFxuLmhlYWRlci1jb2wtdG9vbHRpcC52aXNpYmxlIHtcXG4gIHZpc2liaWxpdHk6IHZpc2libGU7XFxufVxcbi53Z3QtaGVhZGVyIHtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgcG9zaXRpb246IHN0aWNreTtcXG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICB0b3A6IDBweDtcXG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCBsaWdodGdyYXk7XFxuICBvdmVyZmxvdy15OiBoaWRkZW47XFxufVxcbi53Z3QtaGVhZGVyPmRpdi5hcnJvdyB7XFxuICAvKiB2aXNpYmlsaXR5OiBoaWRkZW47ICovXFxuICBjb2xvcjogbGlnaHRncmF5O1xcbiAgd2lkdGg6IDFlbTtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgdG9wOiAwcHg7XFxuICBib3R0b206IDBweDtcXG4gIHJpZ2h0OiAwcHg7XFxuICBwYWRkaW5nLXJpZ2h0OiA1cHg7XFxuICBtYXJnaW4tdG9wOiBhdXRvO1xcbiAgbWFyZ2luLWJvdHRvbTogYXV0bztcXG4gIGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7XFxuICBmb250LXNpemU6IGxhcmdlO1xcbiAgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcXG4gIHBhZGRpbmctdG9wOiA1cHg7XFxuICBwYWRkaW5nLWJvdHRvbTogNXB4O1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgLW1vei11c2VyLXNlbGVjdDogdGV4dDtcXG4gIGJhY2tncm91bmQ6IHdoaXRlO1xcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xcbiAgdHJhbnNmb3JtOiBzY2FsZSgxLCAyKXRyYW5zbGF0ZSgyMCUsIDEzJSk7XFxufVxcbi53Z3QtY29sLWhlYWRlci1jb250YWluZXIge1xcbiAgd2lkdGg6IDFlbTtcXG4gIG92ZXJmbG93LXg6IHZpc2libGU7XFxufVxcbi53Z3QtZmlsdGVyX2NlbGwge1xcbiAgcG9zaXRpb246IHN0aWNreTtcXG4gIHRvcDogMHB4O1xcbiAgYmFja2dyb3VuZDogd2hpdGU7XFxuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IDJlbTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICBmb250LXNpemU6IDFyZW07XFxuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgbGlnaHRncmF5O1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMXB4IDFweCA1cHggMHB4IGxpZ2h0Z3JleTtcXG4gIHBhZGRpbmctdG9wOiA1cHg7XFxuICBwYWRkaW5nLWJvdHRvbTogNXB4O1xcbiAgbWFyZ2luLXRvcDogYXV0bztcXG4gIG1hcmdpbi1ib3R0b206IGF1dG87XFxufVxcbi5maWx0ZXJfaW5wdXQge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiAwcHg7XFxuICBsZWZ0OiAwcHg7XFxuICBib3R0b206IDBweDtcXG4gIHJpZ2h0OiAwcHg7XFxuICBtYXJnaW4tdG9wOiBhdXRvO1xcbiAgbWFyZ2luLWJvdHRvbTogYXV0bztcXG4gIHBhZGRpbmctdG9wOiA1cHg7XFxuICBwYWRkaW5nLWJvdHRvbTogNXB4O1xcbn1cXG4uZmlsdGVyX25lZ2F0b3Ige1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxuICB0b3A6IDBweDtcXG4gIGJvdHRvbTogMHB4O1xcbiAgbGVmdDogMHB4O1xcbiAgcGFkZGluZy1sZWZ0OiA1cHg7XFxuICBtYXJnaW4tdG9wOiBhdXRvO1xcbiAgbWFyZ2luLWJvdHRvbTogYXV0bztcXG4gIGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7XFxuICBmb250LXNpemU6IDFlbTtcXG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICBwYWRkaW5nLXRvcDogNXB4O1xcbiAgcGFkZGluZy1ib3R0b206IDVweDtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG59XFxuLndndC1jZWxsIHtcXG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICBmb250LXNpemU6IDFyZW07XFxuICBwYWRkaW5nLWxlZnQ6IDIwcHg7XFxuICBwYWRkaW5nLXJpZ2h0OiAyMHB4O1xcbiAgcGFkZGluZy10b3A6IDEwcHg7XFxuICBwYWRkaW5nLWJvdHRvbTogMTBweDtcXG4gIGJhY2tncm91bmQ6IHdoaXRlO1xcbiAgLyogYm9yZGVyOiAycHggc29saWQgbGlnaHRncmF5OyAqL1xcbiAgb3ZlcmZsb3cteDogaGlkZGVuO1xcbn1cXG4ud2d0LWRhdGEtY2VsbCB7XFxuICBtYXgtd2lkdGg6IDUwMHB4O1xcbn1cXG4ud2d0LWRhdGEtY2VsbC1tb25leSB7XFxuICB0ZXh0LWFsaWduOiBlbmQ7XFxufVxcbi53Z3QtaGVhZGVyLndndC1jZWxsIHtcXG4gIHBhZGRpbmctcmlnaHQ6IDMwcHg7XFxufVxcbi53Z3QtemVicmFfMSB7XFxuICBiYWNrZ3JvdW5kOiB3aGl0ZTtcXG59XFxuLndndC16ZWJyYV8wIHtcXG4gIGJhY2tncm91bmQ6IHJnYigyMzAsIDIzMCwgMjMwKTtcXG59XFxuLndndC1mb290ZXIge1xcbiAgZGlzcGxheTogZ3JpZDtcXG4gIHBvc2l0aW9uOiBzdGlja3k7XFxuICBib3R0b206IDBweDtcXG4gIGJhY2tncm91bmQ6IHdoaXRlO1xcbiAgYm9yZGVyLXRvcDogMXB4IHNvbGlkIGxpZ2h0Z3JheTtcXG4gIGdyaWQtdGVtcGxhdGUtcm93czogMWZyO1xcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoNCwgZml0LWNvbnRlbnQoMzAwcHgpKSAxZnI7XFxufVxcbi5mb290ZXItYnV0dG9uIHtcXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjcsIDMxLCAzNSwgLjIpO1xcbiAgLyogYm9yZGVyLXJhZGl1czogLjI1ZW07ICovXFxuICB3aWR0aDogbWF4LWNvbnRlbnQ7XFxuICBvdmVyZmxvdzogdmlzaWJsZTtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG4gIGJhY2tncm91bmQtY29sb3I6ICNlZmYzZjY7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQoLTE4MGRlZywgI2ZhZmJmYywgZWZmM2Y2LCA5MCUpO1xcbiAgYmFja2dyb3VuZC1yZXBlYXQ6IHJlcGVhdC14O1xcbiAgYmFja2dyb3VuZC1wb3NpdGlvbjogLTFweCAtMXB4O1xcbiAgYmFja2dyb3VuZC1zaXplOiAxMTAlIDExMCU7XFxuICAtd2Via2l0LWFwcGVhcmFuY2U6IG5vbmU7XFxuICAtbW96LWFwcGVhcmFuY2U6IG5vbmU7XFxuICBhcHBlYXJhbmNlOiBub25lO1xcbiAgdXNlci1zZWxlY3Q6IG5vbmU7XFxufVxcbi5mb290ZXItYnV0dG9uOmhvdmVyIHtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDBweCAwcHggMjBweCAycHggcmdiYSgwLCAwLCAwLCAwLjIpO1xcbn1cXG4uZm9vdGVyLWJ1dHRvbi1kb3duOmFmdGVyIHtcXG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcXG4gIHdpZHRoOiAwcHg7XFxuICBoZWlnaHQ6IDBweDtcXG4gIHZlcnRpY2FsLWFsaWduOiAtMnB4O1xcbiAgY29udGVudDogXFxcIlxcXCI7XFxuICBib3JkZXI6IDRweCBzb2xpZCB0cmFuc3BhcmVudDtcXG4gIGJvcmRlci10b3AtY29sb3I6IGN1cnJlbnRjb2xvcjtcXG59XFxuLmNvbHVtbi1jaG9vc2VyLW1lbnUtY29udGFpbmVyIHtcXG4gIC8qIHBvc2l0aW9uOiBhYnNvbHV0ZTsgKi9cXG4gIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gIHdpZHRoOiAyMDBweDtcXG4gIGhlaWdodDogbWluLWNvbnRlbnQ7XFxuICAvKiB0b3A6IDBweDsgKi9cXG4gIC8qIGJvdHRvbTogMHB4OyAqL1xcbiAgbGVmdDogMHB4O1xcbiAgLyogcmlnaHQ6IDBweDsgKi9cXG4gIC8qIGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwwLDAsLjUpOyAqL1xcbiAgei1pbmRleDogOTk7XFxuICB2aXNpYmlsaXR5OiB2aXNpYmxlO1xcbn1cXG4uY29sdW1uLWNob29zZXItbWVudSB7XFxuICBtYXJnaW4tdG9wOiBhdXRvO1xcbiAgbWFyZ2luLWJvdHRvbTogYXV0bztcXG4gIG92ZXJmbG93OiBoaWRkZW47XFxuICBjb2xvcjogYmxhY2s7XFxuICBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDEwMCwgMTAwLCAxMDAsIDAuNSk7XFxuICBib3JkZXItcmFkaXVzOiA1cHg7XFxuICBsaXN0LXN0eWxlOiBub25lO1xcbiAgcGFkZGluZy1sZWZ0OiAwcHg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBsaWdodGdyYXk7XFxuICBib3gtc2hhZG93OiAxcHggMnB4IDEwcHggMnB4IHJnYmEoMCwgMCwgMCwgMC4yKTtcXG59XFxuLmNvbHVtbi1jaG9vc2VyLW1lbnUtY29udGFpbmVyLmhpZGRlbiB7XFxuICB2aXNpYmlsaXR5OiBoaWRkZW47XFxuICBoZWlnaHQ6IDBweDtcXG59XFxuLmNvbHVtbi1jaG9vc2VyLWl0ZW0ge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XFxuICAvKiBib3JkZXItcmFkaXVzOiA1cHg7ICovXFxuICBtYXJnaW4tdG9wOiAxcHg7XFxuICB1c2VyLXNlbGVjdDogbm9uZTtcXG4gIHdoaXRlLXNwYWNlOiBub3dyYXA7XFxufVxcbi5jb2x1bW4tY2hvb3Nlci1pdGVtOmZpcnN0LWNoaWxkIHtcXG4gIG1hcmdpbi10b3A6IDBweDtcXG59XFxuLmNvbHVtbi1jaG9vc2VyLWl0ZW06aG92ZXIge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogbGlnaHRibHVlO1xcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4gIGJhY2tncm91bmQtY2xpcDogcGFkZGluZy1ib3g7XFxuICBib3JkZXItcmFkaXVzOiA1cHg7XFxufVxcbi5jb2x1bW4tY2hvb3Nlci1pdGVtPmxhYmVsIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgcGFkZGluZzogNXB4IDIwcHggNXB4IDVweDtcXG59XFxuLnBhZ2UtY2hvb3NlciB7XFxuICBkaXNwbGF5OiBncmlkO1xcbiAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiBhdXRvO1xcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoOSwgYXV0byk7XFxuICBmb250LWZhbWlseTogbW9ub3NwYWNlO1xcbiAgZ3JpZC1jb2x1bW46IC0xO1xcbiAgYm9yZGVyLWxlZnQ6IG5vbmU7XFxuICBwb3NpdGlvbjogc3RpY2t5O1xcbiAgcmlnaHQ6IDBweDtcXG59XFxuLnBhZ2UtY2hvb3Nlci5zZWxlY3RlZCB7XFxuICBib3JkZXItbGVmdDogMXB4IGRvdHRlZCBncmF5O1xcbn1cXG4ucGFnZS1jaGFuZ2Uge1xcbiAgbWFyZ2luLXRvcDogYXV0bztcXG4gIG1hcmdpbi1ib3R0b206IGF1dG87XFxuICBwYWRkaW5nLWxlZnQ6IDVweDtcXG4gIHBhZGRpbmctcmlnaHQ6IDVweDtcXG59XFxuLnBhZ2UtY2hhbmdlOmZpcnN0LWNoaWxkIHtcXG4gIG1hcmdpbi10b3A6IGF1dG8gIWltcG9ydGFudDtcXG59XFxuLnBhZ2UtY2hhbmdlOm5vdCgucGFnZS1jaGFuZ2UtZGlzYWJsZWQpIHtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG59XFxuLnBhZ2UtY2hhbmdlLWRpc2FibGVkIHtcXG4gIGNvbG9yOiBncmF5O1xcbn1cXG4uYWN0aXZlLXBhZ2Uge1xcbiAgZm9udC13ZWlnaHQ6IGJvbGQ7XFxufVxcbi53Z3QtZm9vdGVyX2NlbGwge1xcbiAgYm9yZGVyLXJpZ2h0OiAxcHggc29saWQgbGlnaHRncmF5O1xcbiAgd2lkdGg6IG1heC1jb250ZW50O1xcbn1cXG5ALW1vei1kb2N1bWVudCB1cmwtcHJlZml4KCkgIHtcXG4gIC53Z3QtZ3JpZC1jb250YWluZXIgZGl2Om50aC1sYXN0LWNoaWxkKDIpLndndC1kYXRhLWNlbGwge1xcbiAgICBoZWlnaHQ6IDIwMCU7XFxuICB9XFxuXFxuICAuZmlsdGVyX25lZ2F0b3Ige1xcbiAgICBmb250LXNpemU6IDFlbTtcXG4gIH1cXG59XFxuXCI7IChyZXF1aXJlKFwiYnJvd3NlcmlmeS1jc3NcIikuY3JlYXRlU3R5bGUoY3NzLCB7IFwiaHJlZlwiOiBcIm5vZGVfbW9kdWxlc1xcXFx3Yy1ncmlkLXRhYmxlXFxcXHNyY1xcXFx3Yy1ncmlkLXRhYmxlLmNzc1wiIH0sIHsgXCJpbnNlcnRBdFwiOiBcImJvdHRvbVwiIH0pKTsgbW9kdWxlLmV4cG9ydHMgPSBjc3M7IiwiLy8/IEZFQVRVUkU6IG1heWJlIGFkZCBwb3NzaWJpbGl0eSBmb3IgaG9yaXpvbnRhbCBoZWFkZXIgZWl0aGVyXHJcbi8vPyBUb3AgLT4gRG93biAtIGNzczogeyB3cml0aW5nLW1vZGU6IHNpZGV3YXlzLXJsLCB0ZXh0LW9yaWVudGF0aW9uIDogc2lkZXdheXMgfSBvclxyXG4vLz8gQm90dG9tIC0+IFVwIC0gY3NzOiB7IHdyaXRpbmctbW9kZTogc2lkZXdheXMtbHIsIHRleHQtb3JpZW50YXRpb24gOiBzaWRld2F5cyB9XHJcblxyXG5cclxuLyoqXHJcbiAqIFByb2plY3Q6IHdjLWdyaWQtdGFibGVcclxuICogUmVwb3NpdG9yeTogaHR0cHM6Ly9naXRodWIuY29tL1JvYmVydFNlaWRsZXIvd2MtZ3JpZC10YWJsZVxyXG4gKiBBdXRoZXI6IFJvYmVydCBTZWlkbGVyXHJcbiAqIEVtYWlsOiBSb2JlcnQuU2VpZGxlcjFAZ29vZ2xlbWFpbC5jb20gXHJcbiAqIExpY2Vuc2U6IElTQ1xyXG4gKi9cclxuXHJcbnJlcXVpcmUoJy4vd2MtZ3JpZC10YWJsZS5jc3MnKTtcclxuXHJcbi8vIHRlc3QgZXhjZXB0aW9uIHRyYWNrZXIgd2l0aCBhbiBhY3R1YWwgbW9kdWxlLlxyXG4vL1RPRE86IENvbW1lbnQgb3V0IGJlZm9yZSBwYWNrYWdpbmdcclxubGV0IGFwcG5hbWUgPSAnd2MtZ3JpZC10YWJsZSc7XHJcbi8vIGxldCB0cmFja2VyID0gcmVxdWlyZSgnLi4vLi4vZXhjZXB0aW9uLXRyYWNrZXItc2VydmVyL3Rlc3QtY2xpZW50L3RyYWNrZXIuanMnKVxyXG4vLyAgIC5UcmFja2VyXHJcbi8vICAgLmluamVjdENvbnNvbGUoJ2h0dHA6Ly9sb2NhbGhvc3Q6NTIwMDUvJywgJ3djLWdyaWQtdGFibGUnLCB0cnVlLCB0cnVlLCB0cnVlKTtcclxuXHJcblxyXG5jb25zdCB7IHJlZ2V4RmlsdGVyLCB0ZXh0RmlsdGVyLCBjb21wYXJlRmlsdGVyIH0gPSByZXF1aXJlKCcuL2ZpbHRlci11dGlscy5qcycpO1xyXG5jb25zdCB7IGNyZWF0ZVBhZ2VDaG9vc2VyLCBhZGRLZXlIYW5kbGVyVG9Eb2N1bWVudCB9ID0gcmVxdWlyZSgnLi9wYWdpbmF0aW9uLXV0aWxzLmpzJyk7XHJcbi8vIGNvbnN0IHsgVGFibGVDb21wb25lbnQgfSA9IHJlcXVpcmUoJy4vd2MtZ3JpZC10YWJsZS5qcycpO1xyXG5cclxuLyoqXHJcbiAqIEB0eXBlZGVmIHt7W2Z1bmN0aW9uTmFtZTogc3RyaW5nXTogKGFzeW5jICguLi51bmtvd24pID0+IHVua25vd24pfX0gdGFibGVQbHVnaW5DbGFzc0V4dGVuc2lvbkZ1bmN0aW9uc1xyXG4gKiBcclxuICogQHR5cGVkZWYge3tcclxuICogICAgbmFtZTogc3RyaW5nLCBcclxuICogICAgZXhlYzogYXN5bmMgKCkgPT4gdm9pZCwgXHJcbiAqICAgIHR5cGU6IHN0cmluZywgXHJcbiAqICAgIHRhYmxlRXh0ZW5zaW9ucz86IHRhYmxlUGx1Z2luQ2xhc3NFeHRlbnNpb25GdW5jdGlvbnMsXHJcbiAqIH19IFRhYmxlUGx1Z2luIFxyXG4gKi9cclxuXHJcbi8qKiBAdHlwZSB7VGFibGVQbHVnaW59ICovXHJcbnZhciB0ZXN0O1xyXG52YXIgdGFibGVDb3VudGVyID0gMDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBDbG9zdXJlLCBzbyB0aGF0IG9ubHkgZnVuY3Rpb25zIEkgd2FudCB0byBleHBvc2UgYXJlIGdldHRpbmcgZXhwb3NlZC5cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGRlZmluZVNldFByb3RvdHlwZUZ1bmN0aW9ucygpIHtcclxuICAgICAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtJdGVyYWJsZX0gYW4gaXRlcmFibGUsIHRoYXQgc2hvdWxkIGJlIHVuaW9uZWQgd2l0aCB0aGUgc3RhcnRpbmcgU2V0XHJcbiAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTZXQucHJvdG90eXBlLCAndW5pb24nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKGFub3RoZXJTZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgZWxlbWVudCBvZiBhbm90aGVyU2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3ROdW1iZXJSZWdleCA9IC9eKC17MCwxfVswLTldezEsM30oPzpbXFwufCxdezAsMX1bMC05XXszfSkqW1xcLnxcXCxdezAsMX1bMC05XSopXFxzezAsMX1cXEQqJC9pO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gZml4Q29sdW1uSGVhZGVyKHRhYmxlLCBjb2xfaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5oZWFkZXIuZm9yRWFjaCgoY29sdW1uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbF9oZWFkZXIgPSB0YWJsZS5lbGVtZW50cy5oZWFkZXJbY29sdW1uXTtcclxuICAgICAgICAgICAgICAgICAgICBjb2xfaGVpZ2h0ID0gY29sX2hlYWRlci5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbF9oZWFkZXIub2Zmc2V0SGVpZ2h0ID4gMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc3RpY2t5U3R5bGUuaW5uZXJIVE1MID0gYFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC50YWJsZS1pZC0ke3RhYmxlLnRhYmxlSWR9ID4gLndndC1maWx0ZXJfY2VsbCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3A6ICR7Y29sX2hlYWRlci5vZmZzZXRIZWlnaHR9cHg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBgO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgbnVtYmVyLCBieSBtYXRjaGluZyBhZ2FpbnN0IGEgUmVnZXguIFxyXG4gICAgICAgICAgICAgKiBPbiBzdWNjZXNzIHRoZSB0aGUgcGFyc2VkIG51bWJlciBpcyByZXR1cm5lZC4gXHJcbiAgICAgICAgICAgICAqIE9uIHVuZGVmaW5lZCBhbiBlbXB0eSBTdHJpbmcgaXMgcmV0dXJuZWQuXHJcbiAgICAgICAgICAgICAqIE90aGVyd2lzZSB0aGUgdGVzdFN0ciBpcyByZXR1cm5lZCB1bnBhcnNlZC4gXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSB0ZXN0U3RyIFxyXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nIHwgTnVtYmVyfSBcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHRyeVRyYW5zZm9ybVRvTnVtYmVyKHRlc3RTdHIpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0ZXN0U3RyID09IHVuZGVmaW5lZCkgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWF0Y2hlcyA9IHRlc3ROdW1iZXJSZWdleC5leGVjKHRlc3RTdHIudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBOdW1iZXIucGFyc2VGbG9hdChtYXRjaGVzWzFdKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdGVzdFN0cjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBDb21wYXJlIGZ1bmN0aW9uIGZvciBjb21wYXJpbmcgbnVtYmVycyBmb3Igc29ydGluZy4gQWRkaXRpb25hbGx5IHVuZGVmaW5lZCB2YWx1ZXMgYXJlIFxyXG4gICAgICAgICAgICAgKiBhbHdheXMgdGhlICdzbWFsbGVyJyB2YWx1ZSwgc28gdGhhdCB0aGV5IGdldCBzb3J0ZWQgdG8gdGhlIGJvdHRvbS5cclxuICAgICAgICAgICAgICogQ2FuIGJlIHJlcGxhY2VkIGJ5IHN1cHBseWluZyBhIGN1c3RvbSBjb21wYXJlIGZ1bmN0aW9uIHRvIFRhYmxlQ29tcG9uZW50LmN1c3RvbUNvbXBhcmVOdW1iZXJzLlxyXG4gICAgICAgICAgICAgKiBcclxuICAgICAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IGEgbnVtYmVyIHRvIGNvbXBhcmUuIFxyXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gYiBudW1iZXIgdG8gY29tcGFyZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNvbXBhcmVOdW1iZXJzKGEsIGIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChhID09IHVuZGVmaW5lZCB8fCBhID09PSAnJykgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICBpZiAoYiA9PSB1bmRlZmluZWQgfHwgYiA9PT0gJycpIHJldHVybiAtMTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnlUcmFuc2Zvcm1Ub051bWJlcihiKSAtIHRyeVRyYW5zZm9ybVRvTnVtYmVyKGEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQ29tcGFyZSBmdW5jdGlvbiBmb3IgY29tcGFyaW5nIHN0cmluZ3MgZm9yIHNvcnRpbmcuIEFkZGl0aW9uYWxseSB1bmRlZmluZWQgdmFsdWVzIGFyZVxyXG4gICAgICAgICAgICAgKiBhbHdheXMgdGhlICdzbWFsbGVyJyB2YWx1ZSwgc28gdGhhdCB0aGV5IGdldCBzb3J0ZWQgdG8gdGhlIGJvdHRvbS4gXHJcbiAgICAgICAgICAgICAqIENhbiBiZSByZXBsYWNlZCBieSBzdXBwbHlpbmcgYSBjdXN0b20gY29tcGFyZSBmdW5jdGlvbiB0byBUYWJsZUNvbXBvbmVudC5jdXN0b21Db21wYXJlVGV4dC5cclxuICAgICAgICAgICAgICogXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhIHRleHQgdG8gY29tcGFyZS5cclxuICAgICAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGIgdGV4dCB0byBjb21wYXJlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZnVuY3Rpb24gY29tcGFyZVRleHQoYSwgYikge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IDA7XHJcbiAgICAgICAgICAgICAgICBpZiAoYSA9PSB1bmRlZmluZWQgfHwgYSA9PT0gJycpIHJldHVybiAxO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIgPT0gdW5kZWZpbmVkIHx8IGIgPT09ICcnKSByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgICAgICBpZiAoYS50b1N0cmluZygpID4gYi50b1N0cmluZygpKSByZXN1bHQgPSAtMTtcclxuICAgICAgICAgICAgICAgIGlmIChhLnRvU3RyaW5nKCkgPCBiLnRvU3RyaW5nKCkpIHJlc3VsdCA9IDE7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogTWFwIGRpZmZlcmVudCBjb21wYXJlIGZ1bmN0aW9ucywgZGVwZW5kaW5nIG9uIHRoZSBjb250ZW50IG9mIHRoaXMgY29sdW1uLiBEZWZhdWx0IGlzIGEgZGlzdGluY3Rpb24gYmV0d2VlbiBudW1iZXJzIGFuZCB0ZXh0LlxyXG4gICAgICAgICAgICAgKiBUaGUgY2hvb3NlU29ydENvbXBhcmVGbiBhcyB3ZWxsIGFzIHRoZSBjb21wYXJlTnVtYmVycyBhbmQgY29tcGFyZVRleHQgZnVuY3Rpb25zIGNhbiBiZSByZXBsYWNlZCBieSBjdXN0b20gb25lcy5cclxuICAgICAgICAgICAgICogY2hvb3NlU29ydENvbXBhcmVGbiAtPiBUYWJsZUNvbXBvbmVudC5jdXN0b21DaG9vc2VTb3J0c0NvbXBhcmVGblxyXG4gICAgICAgICAgICAgKiBcclxuICAgICAgICAgICAgICogQHBhcmFtIHtUYWJsZUNvbXBvbmVudH0gdGFibGUgdGhlIGFjdGl2ZSBpbnN0YW5jZSBvZiBUYWJsZUNvbXBvbmVudC5cclxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheTxPYmplY3Q+fSBkYXRhIFxyXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29sdW1uIHRoZSBjb2x1bW4gbmFtZSAoaGVhZGVyKSBmb3Igd2hpY2ggYSBjb21wYXJlIGZ1bmN0aW9uIGlzIHRvIGNob29zZS4gXHJcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHsoYTogc3RyaW5nLCBiOiBzdHJpbmcpID0+IG51bWJlciB8IChhOiBudW1iZXIsIGI6IG51bWJlcikgPT4gbnVtYmVyfSB0aGUgY29tcGFyZSBmdW5jdGlvbiB0byBiZSB1c2VkXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBmdW5jdGlvbiBjaG9vc2VTb3J0c0NvbXBhcmVGbih0YWJsZSwgZGF0YSwgY29sdW1uKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpZighTnVtYmVyLmlzTmFOKGRhdGEucmVkdWNlKChjb2wsIGN1cikgPT4gKGNvbCArPSBjdXJbY29sdW1uXSAhPSB1bmRlZmluZWQgPyBOdW1iZXIucGFyc2VGbG9hdChjdXJbY29sdW1uXSkgOiAwKSwgMCkpKXtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmV2ZXJ5KHJvdyA9PiAodHlwZW9mKHRyeVRyYW5zZm9ybVRvTnVtYmVyKHJvd1tjb2x1bW5dKSkgPT0gJ251bWJlcicgfHwgcm93W2NvbHVtbl0gPT0gdW5kZWZpbmVkIHx8IHJvd1tjb2x1bW5dLnRyaW0oKSA9PSBcIlwiKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFibGUuY3VzdG9tQ29tcGFyZU51bWJlcnNcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhYmxlLmN1c3RvbUNvbXBhcmVUZXh0XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBSZWdpc3RlciB0aGUgVGFibGVDb21wb25lbnQgdG8gdGhlIGN1c3RvbUVsZW1lbnRSZWdpc3RyeSwgc28gdGhhdCBpdCBjYW4gYmUgdXNlZCBhcyBhIFdlYkNvbXBvbmVudC5cclxuICAgICAgICAgICAgICogXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Y2xhc3N9IFRhYmxlQ29tcG9uZW50IFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZnVuY3Rpb24gZGVmaW5lQ3VzdG9tRWxlbWVudCgpIHtcclxuICAgICAgICAgICAgICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnd2MtZ3JpZC10YWJsZScsIFRhYmxlQ29tcG9uZW50KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gb25Tb3J0Q2xpY2sodGFibGUsIGNvbHVtbiwgZXZlbnQsIGRvUmVkcmF3KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGFibGUuaGVhZGVyLmluY2x1ZGVzKGNvbHVtbikpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGFibGUuc29ydGVkQnkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFibGUuc29ydGVkQnlbMF0uY29sID09PSBjb2x1bW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLnNvcnRlZEJ5WzBdLmRpciA9IHRhYmxlLnNvcnRlZEJ5WzBdLmRpciA9PT0gXCJhc2NcIiA/IFwiZGVzY1wiIDogXCJhc2NcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5pbm5lckhUTUwgPSB0YWJsZS5zb3J0ZWRCeVswXS5kaXIgPT09IFwiYXNjXCIgPyBcIiZ1YXJyO1wiIDogXCImZGFycjtcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRhYmxlLnNvcnRlZERhdGEgPSBbXS5jb25jYXQodGFibGUuc29ydGVkRGF0YS5maWx0ZXIoZW50cnkgPT4gZW50cnlbY29sdW1uXSAhPSB1bmRlZmluZWQpLnJldmVyc2UoKSwgdGFibGUuc29ydGVkRGF0YS5maWx0ZXIoZW50cnkgPT4gZW50cnlbY29sdW1uXSA9PSB1bmRlZmluZWQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRhYmxlLnJlZHJhd0RhdGEoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmhlYWRlci5maWx0ZXIoaGVhZGVyX2tleSA9PiBoZWFkZXJfa2V5ICE9PSBjb2x1bW4pLmZvckVhY2goaGVhZGVyX2tleSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbaGVhZGVyX2tleV0uaW5uZXJIVE1MICE9PSAnJiM4NjkzOycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1toZWFkZXJfa2V5XS5hcnJvd0FscGhhQ29sb3IgPSB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2hlYWRlcl9rZXldLmFycm93QWxwaGFDb2xvciAqIDAuNTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1toZWFkZXJfa2V5XS5zdHlsZS5jb2xvciA9IGByZ2IoMCwgMCwgMCwgJHt0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2hlYWRlcl9rZXldLmFycm93QWxwaGFDb2xvcn0pYDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLnNvcnRlZEJ5ID0gW10uY29uY2F0KFtuZXcgT2JqZWN0KHsgY29sOiBjb2x1bW4sIGRpcjogXCJhc2NcIiB9KV0sIHRhYmxlLnNvcnRlZEJ5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2NvbHVtbl0uaW5uZXJIVE1MID0gdGFibGUuc29ydGVkQnlbMF0uZGlyID09PSBcImFzY1wiID8gXCImdWFycjtcIiA6IFwiJmRhcnI7XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5hcnJvd0FscGhhQ29sb3IgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2NvbHVtbl0uc3R5bGUuY29sb3IgPSBgcmdiKDAsIDAsIDAsICR7dGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLmFycm93QWxwaGFDb2xvcn0pYDtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5zb3J0ZWRCeSA9IFtdLmNvbmNhdCh0YWJsZS5zb3J0ZWRCeSwgW25ldyBPYmplY3QoeyBjb2w6IGNvbHVtbiwgZGlyOiBcImFzY1wiIH0pXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5pbm5lckhUTUwgPSBcIiZ1YXJyO1wiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2NvbHVtbl0uYXJyb3dBbHBoYUNvbG9yID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLnN0eWxlLmNvbG9yID0gYHJnYigwLCAwLCAwLCAke3RhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5hcnJvd0FscGhhQ29sb3J9KWA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLnNlcmlhbGl6ZUxpbmtPcHRpb25zKClcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZG9SZWRyYXcpIHRhYmxlLnJlZHJhd0RhdGEoKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gdHJhbnNmb3JtVG9Hcm91cGVkRGF0YShpbml0aWFsRGF0YSwgZ3JvdXBDb2x1bW5zKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZ3JvdXBzID0gaW5pdGlhbERhdGEubWFwKGZ1bGxSb3cgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwQ29sdW1ucy5mb3JFYWNoKGdyb3VwQ29sdW1uID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtncm91cENvbHVtbl0gPSBmdWxsUm93W2dyb3VwQ29sdW1uXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAucmVkdWNlKChjb2wsIGN1cikgPT4gKCFjb2wuaW5jbHVkZXMoY3VyKSA/IFtdLmNvbmNhdChjb2wsIFtjdXJdKSA6IGNvbCksIFtdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhncm91cHMpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBmaWx0ZXJDaGFuZ2VkKHRhYmxlLCBjb2x1bW4sIGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlID0gMTtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmZpbHRlcltjb2x1bW5dID0gZXZlbnQuc3JjRWxlbWVudC50ZXh0Q29udGVudDtcclxuICAgICAgICAgICAgICAgIHRhYmxlLnJlZHJhd0RhdGEoKTtcclxuICAgICAgICAgICAgICAgIHRhYmxlLnNlcmlhbGl6ZUxpbmtPcHRpb25zKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIHRhYmxlLmZpbHRlck5lZ2F0ZVtjb2x1bW5dID09PSB1bmRlZmluZWQgc2hhbGwgYmUgZXF1YWwgdG8gJ2NvbnRhaW5zJy5cclxuICAgICAgICAgICAgICogQHBhcmFtIHsqfSB0YWJsZSBcclxuICAgICAgICAgICAgICogQHBhcmFtIHsqfSBjb2x1bW4gXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gZXZlbnQgXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVGaWx0ZXJOZWdhdG9yKHRhYmxlLCBjb2x1bW4sIHJldmVyc2UsIGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld09wZXJhdGlvbiA9IHRhYmxlLmFjdGl2ZUZpbHRlck9wZXJhdGlvbnNbY29sdW1uXTtcclxuICAgICAgICAgICAgICAgIGlmIChuZXdPcGVyYXRpb24gPT09IHVuZGVmaW5lZCB8fCBuZXdPcGVyYXRpb24gPT0gJycpIG5ld09wZXJhdGlvbiA9IHRhYmxlLmZpbHRlck9wZXJhdGlvbnNbMF0ubmFtZTtcclxuICAgICAgICAgICAgICAgIG5ld09wZXJhdGlvbiA9IHRhYmxlLmZpbHRlck9wZXJhdGlvbnNbKHRhYmxlLmZpbHRlck9wZXJhdGlvbnMuZmluZEluZGV4KGVsZW1lbnQgPT4gKGVsZW1lbnQubmFtZSA9PSBuZXdPcGVyYXRpb24pKSArIHRhYmxlLmZpbHRlck9wZXJhdGlvbnMubGVuZ3RoICsgKHJldmVyc2UgPyAtMSA6IDEpKSAlIHRhYmxlLmZpbHRlck9wZXJhdGlvbnMubGVuZ3RoXS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRhYmxlLmVsZW1lbnRzLmZpbHRlck9wZXJhdGlvbnNbY29sdW1uXSkgdGFibGUuZWxlbWVudHMuZmlsdGVyT3BlcmF0aW9uc1tjb2x1bW5dLmlubmVySFRNTCA9IHRhYmxlLmZpbHRlck9wZXJhdGlvbnMuZmluZChvcCA9PiBvcC5uYW1lID09IG5ld09wZXJhdGlvbikuY2hhcjtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmFjdGl2ZUZpbHRlck9wZXJhdGlvbnNbY29sdW1uXSA9IG5ld09wZXJhdGlvbjtcclxuICAgICAgICAgICAgICAgIHRhYmxlLnJlZHJhd0RhdGEoKTtcclxuICAgICAgICAgICAgICAgIHRhYmxlLnNlcmlhbGl6ZUxpbmtPcHRpb25zKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHNldFVwU29ydGluZyhlbGVtZW50LCBjb2x1bW4sIHRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50KSA9PiBvblNvcnRDbGljayh0YWJsZSwgY29sdW1uLCBldmVudCwgdHJ1ZSkpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNyZWF0ZUhlYWRlclRvb2x0aXAodGFibGUpIHtcclxuICAgICAgICAgICAgICAgIGxldCB0b29sdGlwID0gdGFibGUuZWxlbWVudHMudG9vbHRpcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgdG9vbHRpcC5zdGF0ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXRMZWZ0OiAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0b29sdGlwLmNsYXNzTGlzdC5hZGQoJ2hlYWRlci1jb2wtdG9vbHRpcCcpO1xyXG4gICAgICAgICAgICAgICAgdG9vbHRpcC5jbGFzc0xpc3QuYWRkKCd3Z3QtY2VsbCcpO1xyXG4gICAgICAgICAgICAgICAgdGFibGUuYXBwZW5kKHRvb2x0aXApXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIG9uSGVhZGVyTW91c2VFbnRlcih0YWJsZSwgY29sdW1uRWxlbWVudCwgY29sdW1uTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMudG9vbHRpcC5pbm5lckhUTUwgPSBjb2x1bW5OYW1lO1xyXG4gICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMudG9vbHRpcC5zdGF0ZS5vZmZzZXRMZWZ0ID0gY29sdW1uRWxlbWVudC5vZmZzZXRMZWZ0O1xyXG4gICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMudG9vbHRpcC5zdHlsZS5sZWZ0ID0gYCR7KGNvbHVtbkVsZW1lbnQub2Zmc2V0TGVmdCkgLSB0YWJsZS5zY3JvbGxMZWZ0fXB4YDtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnRvb2x0aXAuY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBvbkhlYWRlck1vdXNlTGVhdmUodGFibGUsIGNvbHVtbkVsZW1lbnQsIGNvbHVtbk5hbWUpIHtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnRvb2x0aXAuY2xhc3NMaXN0LnJlbW92ZSgndmlzaWJsZScpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBjcmVhdGVIZWFkZXIodGFibGUpIHtcclxuICAgICAgICAgICAgICAgIGxldCBjb2xfaGVpZ2h0ID0gMDtcclxuICAgICAgICAgICAgICAgIGNyZWF0ZUhlYWRlclRvb2x0aXAodGFibGUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0YWJsZS5lbGVtZW50cy5oZWFkZXIpIHRhYmxlLmVsZW1lbnRzLmhlYWRlciA9IHt9O1xyXG4gICAgICAgICAgICAgICAgdGFibGUuaGVhZGVyLmZvckVhY2goKGNvbHVtbiwgY29sdW1uSW5kZXgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY29sX2hlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9oZWFkZXIuY2xhc3NMaXN0LmFkZCgnd2d0LWhlYWRlcicpXHJcbiAgICAgICAgICAgICAgICAgICAgY29sX2hlYWRlci5jbGFzc0xpc3QuYWRkKGB3Z3QtY29sdW1uXyR7Y29sdW1uLnNwbGl0KCcgJykuam9pbignXycpfWApXHJcbiAgICAgICAgICAgICAgICAgICAgY29sX2hlYWRlci5jbGFzc0xpc3QuYWRkKCd3Z3QtY2VsbCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjb2xfY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29sX2NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCd3Z3QtY29sLWhlYWRlci1jb250YWluZXInKTtcclxuICAgICAgICAgICAgICAgICAgICBjb2xfY29udGFpbmVyLmlubmVySFRNTCA9IGNvbHVtbjtcclxuICAgICAgICAgICAgICAgICAgICBjb2xfaGVhZGVyLmFwcGVuZChjb2xfY29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgICAgICBjb2xfaGVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZW50ZXInLCBvbkhlYWRlck1vdXNlRW50ZXIuYmluZCh0aGlzLCB0YWJsZSwgY29sX2hlYWRlciwgY29sdW1uKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29sX2hlYWRlci5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJywgb25IZWFkZXJNb3VzZUxlYXZlLmJpbmQodGhpcywgdGFibGUsIGNvbF9oZWFkZXIsIGNvbHVtbikpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmFwcGVuZChjb2xfaGVhZGVyKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9oZWlnaHQgPSBjb2xfaGVhZGVyLm9mZnNldEhlaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc29ydF9hcnJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNvcnRfYXJyb3cuY2xhc3NMaXN0LmFkZCgnYXJyb3cnKTtcclxuICAgICAgICAgICAgICAgICAgICBzb3J0X2Fycm93LmlubmVySFRNTCA9ICcmIzg2OTM7JztcclxuICAgICAgICAgICAgICAgICAgICBzb3J0X2Fycm93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZW50ZXInLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkhlYWRlck1vdXNlTGVhdmUodGFibGUsIGNvbF9oZWFkZXIsIGNvbHVtbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHNvcnRfYXJyb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsIG9uSGVhZGVyTW91c2VFbnRlci5iaW5kKHRoaXMsIHRhYmxlLCBjb2xfaGVhZGVyLCBjb2x1bW4pKTtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5oZWFkZXJbY29sdW1uXSA9IGNvbF9oZWFkZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dID0gc29ydF9hcnJvdztcclxuICAgICAgICAgICAgICAgICAgICBzZXRVcFNvcnRpbmcoc29ydF9hcnJvdywgY29sdW1uLCB0YWJsZSlcclxuICAgICAgICAgICAgICAgICAgICBjb2xfaGVhZGVyLmFwcGVuZChzb3J0X2Fycm93KVxyXG5cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdGFibGUuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMudG9vbHRpcC5zdHlsZS5sZWZ0ID0gYCR7KHRhYmxlLmVsZW1lbnRzLnRvb2x0aXAuc3RhdGUub2Zmc2V0TGVmdCkgLSB0YWJsZS5zY3JvbGxMZWZ0fXB4YDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhldmVudC5kYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhT2JqID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTsgLy8gZGF0YU9iaiA9IHt0eXBlOiAnZml4LWNvbHVtbnMnLCBlbGVtZW50OiB1bmRlZmluZWQsIGRhdGE6IHVuZGVmaW5lZH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhT2JqLnR5cGUgPT09ICdmaXgtY29sdW1ucycpIGZpeENvbHVtbkhlYWRlcih0YWJsZSwgY29sX2hlaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IubmFtZSA9PSAnU3ludGF4RXJyb3InKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWdub3JlIGpzb24gcGFyc2UgZXJyb3JzOyBhbGwgbWVzc2FnZXMgZnJvbSBtZSB1c2UganNvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmaXhDb2x1bW5IZWFkZXIuYmluZCh0aGlzLCB0YWJsZSwgY29sX2hlaWdodCksIDEwMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZVN0aWNreUZpbHRlclN0eWxlKHRhYmxlLCBjb2xfaGVpZ2h0KTtcclxuICAgICAgICAgICAgICAgIH0pOyAvLyBjcmVhdGVTdGlja3lGaWx0ZXJTdHlsZSh0YWJsZSwgY29sX2hlaWdodCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNyZWF0ZVN0aWNreUZpbHRlclN0eWxlKHRhYmxlLCBjb2xfaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdG1wX3N0eWxlID0gdGFibGUuZWxlbWVudHMuc3RpY2t5U3R5bGU7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRtcF9zdHlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnN0aWNreVN0eWxlID0gdG1wX3N0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuICAgICAgICAgICAgICAgICAgICB0bXBfc3R5bGUudHlwZSA9IFwidGV4dC9jc3NcIjtcclxuICAgICAgICAgICAgICAgICAgICB0bXBfc3R5bGUuY2xhc3NMaXN0LmFkZCgnc3RpY2t5X2ZpbHRlcl9vZmZzZXQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRtcF9zdHlsZS5pbm5lckhUTUwgPSBgXHJcbiAgICAgIC50YWJsZS1pZC0ke3RhYmxlLnRhYmxlSWR9ID4gLndndC1maWx0ZXJfY2VsbCB7XHJcbiAgICAgICAgdG9wOiAke2NvbF9oZWlnaHR9cHg7XHJcbiAgICAgIH1cclxuICAgIGA7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5yb290X2RvY3VtZW50LmhlYWQuYXBwZW5kKHRtcF9zdHlsZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNyZWF0ZUZpbHRlcih0YWJsZSwgaGVhZGVyLCBmaWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmZpbHRlckNlbGxzID0ge307XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5maWx0ZXJPcGVyYXRpb25zID0ge307XHJcbiAgICAgICAgICAgICAgICBoZWFkZXIuZm9yRWFjaChjb2x1bW4gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmaWx0ZXJfY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbGV0IGZpbHRlcl9pbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyX2lucHV0LnR5cGUgPSAndGV4dCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyX2lucHV0LmNsYXNzTGlzdC5hZGQoJ3dndC1maWx0ZXJfaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXJfaW5wdXQudmFsdWUgPSBmaWx0ZXJbY29sdW1uXSA/IGZpbHRlcltjb2x1bW5dIDogJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyX2NvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIGV2ZW50ID0+IGZpbHRlckNoYW5nZWQuYmluZChudWxsLCB0YWJsZSwgY29sdW1uKShldmVudCkpXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyX2NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCd3Z3QtZmlsdGVyX2NlbGwnLCBgd2d0LWZpbHRlcl9jZWxsXyR7Y29sdW1uLnNwbGl0KCcgJykuam9pbignXycpfWAsICd3Z3QtZmlsdGVyX2lucHV0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyX2NvbnRhaW5lci5jb250ZW50RWRpdGFibGUgPSAndHJ1ZSc7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmaWx0ZXJfaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcl9pbnB1dC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIGV2ZW50ID0+IGZpbHRlckNoYW5nZWQuYmluZChudWxsLCB0YWJsZSwgY29sdW1uKShldmVudCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcl9pbnB1dC5jbGFzc0xpc3QuYWRkKCdmaWx0ZXJfaW5wdXQnKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJfaW5wdXQuY29udGVudEVkaXRhYmxlID0gJ3RydWUnO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmaWx0ZXJfbmVnYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuZmlsdGVyT3BlcmF0aW9uc1tjb2x1bW5dID0gZmlsdGVyX25lZ2F0ZTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJfbmVnYXRlLmlubmVySFRNTCA9ICcmc3ViZTsnO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcl9uZWdhdGUuY2xhc3NMaXN0LmFkZCgnZmlsdGVyX25lZ2F0b3InKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyX25lZ2F0ZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHRvZ2dsZUZpbHRlck5lZ2F0b3IuYmluZChudWxsLCB0YWJsZSwgY29sdW1uLCBmYWxzZSkoZXZlbnQpKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJfbmVnYXRlLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZXZlbnQgPT4gdG9nZ2xlRmlsdGVyTmVnYXRvci5iaW5kKG51bGwsIHRhYmxlLCBjb2x1bW4sIHRydWUpKGV2ZW50KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyX25lZ2F0ZS5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyX25lZ2F0ZS5zdHlsZS5cclxuICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXJfY29udGFpbmVyLmFwcGVuZChmaWx0ZXJfaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcl9jb250YWluZXIuYXBwZW5kKGZpbHRlcl9pbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyX2NvbnRhaW5lci5hcHBlbmQoZmlsdGVyX25lZ2F0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuZmlsdGVyQ2VsbHNbY29sdW1uXSA9IGZpbHRlcl9jb250YWluZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUuYXBwZW5kKGZpbHRlcl9jb250YWluZXIpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gY3JlYXRlUmVzZXRMaW5rQnV0dG9uKHRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICBidG4uY2xhc3NMaXN0LmFkZCgnZm9vdGVyLWJ1dHRvbicsICd3Z3QtZm9vdGVyLWNlbGwnLCAnd2d0LWNlbGwnKTtcclxuICAgICAgICAgICAgICAgIGJ0bi5pbm5lckhUTUwgPSAncmVzZXQnO1xyXG4gICAgICAgICAgICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlybSgnU2ljaGVyLCBkYXNzIGFsbGUgYW5nZXdlbmRldGVuIFVtZm9ybXVuZ2VuIHp1csO8Y2tnZXNldHp0IHdlcmRlbiBzb2xsZW4nKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsLnNlYXJjaCA9ICc/JyArIHVybC5zZWFyY2guc2xpY2UoMSkuc3BsaXQoJyYnKS5maWx0ZXIoZW50cnkgPT4gIWVudHJ5LnNwbGl0KCc9JylbMF0uc3RhcnRzV2l0aCgndGFibGUnKSkuam9pbignJicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5ocmVmID0gdXJsLmhyZWY7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnRuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBjcmVhdGVGb290ZXIodGFibGUsIGRhdGEsIHBhZ2VDaG9vc2VyKSB7XHJcbiAgICAgICAgICAgICAgICBiaW5kQ29sdW1uQ2hvb3NlckhhbmRsZXIodGFibGUpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGZvb3RlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgZm9vdGVyLmNsYXNzTGlzdC5hZGQoJ3dndC1mb290ZXInKTtcclxuICAgICAgICAgICAgICAgIGZvb3Rlci5zdHlsZS5ncmlkQ29sdW1uID0gYDEgLyAke3RhYmxlLmhlYWRlci5sZW5ndGggKyAxfWA7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCF0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyTWVudUNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJNZW51Q29udGFpbmVyID0gY3JlYXRlQ29sdW1uQ2hvb3Nlck1lbnVDb250YWluZXIodGFibGUsIHRhYmxlLmhlYWRlckFsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUucGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUodGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3Nlck1lbnVDb250YWluZXIsIHRhYmxlLm5leHRTaWJsaW5nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdG90YWxfcm93cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgdG90YWxfcm93cy5pbm5lckhUTUwgPSBgVG90YWw6ICR7dGFibGUuZGF0YS5sZW5ndGh9YDtcclxuICAgICAgICAgICAgICAgIHRvdGFsX3Jvd3MuY2xhc3NMaXN0LmFkZCgnd2d0LWZvb3Rlcl9jZWxsJywgJ3dndC1jZWxsJylcclxuICAgICAgICAgICAgICAgIGZvb3Rlci5hcHBlbmQodG90YWxfcm93cylcclxuICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnRvdGFsX3Jvd3MgPSB0b3RhbF9yb3dzO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0YWJsZS5kYXRhLmxlbmd0aCAhPT0gZGF0YS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZmlsdGVyZWRfcm93X2NvdW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWRfcm93X2NvdW50LmlubmVySFRNTCA9IGBGaWx0ZXJlZDogJHtkYXRhLmxlbmd0aH0ke3RhYmxlLnBhZ2luYXRpb24uYWN0aXZlID8gYCAvICR7dGFibGUucGFnaW5hdGlvbi5maWx0ZXJlZERhdGFDb3VudH1gIDogJyd9YDtcclxuICAgICAgICAgICAgICAgICAgZmlsdGVyZWRfcm93X2NvdW50LmNsYXNzTGlzdC5hZGQoJ3dndC1mb290ZXJfY2VsbCcsICd3Z3QtY2VsbCcpO1xyXG4gICAgICAgICAgICAgICAgICBmb290ZXIuYXBwZW5kKGZpbHRlcmVkX3Jvd19jb3VudCk7XHJcbiAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmZpbHRlcmVkX3Jvd19jb3VudCA9IGZpbHRlcmVkX3Jvd19jb3VudDtcclxuICAgICAgICAgICAgICB9XHJcbiAgXHJcbiAgICAgICAgICAgICAgaWYoZm9vdGVyKSBmb290ZXIuYXBwZW5kKGNyZWF0ZUNvbHVtbkNob29zZXJCdXR0b24odGFibGUpKTtcclxuICAgICAgICAgICAgICBpZih0YWJsZS5kcmF3T3B0aW9uYWxzLnJld3JpdGV1cmwpIGZvb3Rlci5hcHBlbmQoY3JlYXRlUmVzZXRMaW5rQnV0dG9uKHRhYmxlKSk7XHJcbiAgICAgICAgICAgICAgaWYocGFnZUNob29zZXIpIGZvb3Rlci5hcHBlbmQocGFnZUNob29zZXIpO1xyXG4gICAgICAgICAgICAgIGlmKHRhYmxlLmVsZW1lbnRzLmZvb3RlcikgdGFibGUuZWxlbWVudHMuZm9vdGVyLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmZvb3RlciA9IGZvb3RlcjtcclxuICAgICAgICAgICAgICBpZih0YWJsZS5wbHVnaW5zLnVpKSBSZWZsZWN0Lm93bktleXModGFibGUucGx1Z2lucy51aSkuZm9yRWFjaChwbHVnaW5LZXkgPT4gdGFibGUucGx1Z2lucy51aVtwbHVnaW5LZXldLmFkZEZvb3RlckJ1dHRvbih0YWJsZSkpO1xyXG4gICAgICAgICAgICAgIHRhYmxlLmFwcGVuZChmb290ZXIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gIGxldCBib3VuZENvbHVtbkNob29zZXJCdXR0b25IYW5kbGVyID0gdW5kZWZpbmVkO1xyXG4gIGxldCBib3VuZENvbHVtbkNob29zZXJPdXRzaWRlSGFuZGxlciA9IHVuZGVmaW5lZDtcclxuICBsZXQgYm91bmRDb2x1bW5DaG9vc2VyQ2hhbmdlQ29sdW1uSGFuZGxlciA9IHVuZGVmaW5lZDtcclxuXHJcbiAgZnVuY3Rpb24gYmluZENvbHVtbkNob29zZXJIYW5kbGVyKHRhYmxlKXtcclxuICAgIGJvdW5kQ29sdW1uQ2hvb3NlckJ1dHRvbkhhbmRsZXIgPSBvbkNvbHVtbkNob29zZXJCdXR0b25IYW5kbGVyLmJpbmQobnVsbCwgdGFibGUpO1xyXG4gICAgYm91bmRDb2x1bW5DaG9vc2VyT3V0c2lkZUhhbmRsZXIgPSBvbkNvbHVtbkNob29zZXJPdXRzaWRlSGFuZGxlci5iaW5kKG51bGwsIHRhYmxlKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNyZWF0ZUNvbHVtbkNob29zZXJCdXR0b24odGFibGUpe1xyXG4gICAgbGV0IGJ1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgYnV0LmNsYXNzTGlzdC5hZGQoJ3dndC1mb290ZXJfY2VsbCcsICd3Z3QtY2VsbCcsICdmb290ZXItYnV0dG9uLWRvd24nLCAnZm9vdGVyLWJ1dHRvbicpO1xyXG4gICAgYnV0LmlubmVySFRNTCA9ICdjb2x1bW5zJztcclxuICAgIGJ1dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGJvdW5kQ29sdW1uQ2hvb3NlckJ1dHRvbkhhbmRsZXIpO1xyXG4gICAgcmV0dXJuIGJ1dDsgICAgXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjcmVhdGVDb2x1bW5DaG9vc2VyTWVudUl0ZW1zKHRhYmxlLCBjb2x1bW4pe1xyXG4gICAgbGV0IGNvbEl0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xyXG4gICAgY29sSXRlbS5jbGFzc0xpc3QuYWRkKCdjb2x1bW4tY2hvb3Nlci1pdGVtJywgJ2NvbHVtbi1jaG9vc2VyJyk7XHJcbiAgICBsZXQgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xyXG4gICAgbGFiZWwuaW5uZXJIVE1MID0gY29sdW1uO1xyXG4gICAgbGFiZWwuc2V0QXR0cmlidXRlKCduYW1lJywgY29sdW1uICsgJ19jaGVja2JveCcpO1xyXG4gICAgbGFiZWwuY2xhc3NMaXN0LmFkZCgnY29sdW1uLWNob29zZXInKTtcclxuICAgIGxldCBjaGVja0JveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XHJcbiAgICBjaGVja0JveC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAnY2hlY2tib3gnKTtcclxuICAgIGNoZWNrQm94LnNldEF0dHJpYnV0ZSgnbmFtZScsIGNvbHVtbiArICdfY2hlY2tib3gnKTtcclxuICAgIGlmKCF0YWJsZS5oaWRkZW5Db2x1bW5zLmluY2x1ZGVzKGNvbHVtbikgfHwgdGFibGUudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoY29sdW1uKSl7XHJcbiAgICAgIGNoZWNrQm94LnRvZ2dsZUF0dHJpYnV0ZSgnY2hlY2tlZCcpO1xyXG4gICAgfVxyXG4gICAgY2hlY2tCb3guY2xhc3NMaXN0LmFkZCgnY29sdW1uLWNob29zZXInKTtcclxuICAgIGJvdW5kQ29sdW1uQ2hvb3NlckNoYW5nZUNvbHVtbkhhbmRsZXIgPSBvbkNvbHVtbkNob29zZXJDaGFuZ2VDb2x1bW5IYW5kbGVyLmJpbmQobnVsbCwgdGFibGUsIGNvbHVtbik7XHJcbiAgICBjaGVja0JveC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBib3VuZENvbHVtbkNob29zZXJDaGFuZ2VDb2x1bW5IYW5kbGVyKTtcclxuICAgIHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJDaGVja2JveFtjb2x1bW5dID0gY2hlY2tCb3g7XHJcbiAgICBsYWJlbC5wcmVwZW5kKGNoZWNrQm94KTtcclxuICAgIC8vIGxhYmVsLmlubmVySFRNTCArPSBjb2x1bW47IFxyXG4gICAgY29sSXRlbS5hcHBlbmQobGFiZWwpO1xyXG4gICAgcmV0dXJuIGNvbEl0ZW07XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjcmVhdGVDb2x1bW5DaG9vc2VyTWVudUNvbnRhaW5lcih0YWJsZSwgYWxsSGVhZGVyKXtcclxuICAgIGlmKCF0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyQ2hlY2tib3gpIHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJDaGVja2JveCA9IHt9O1xyXG4gICAgbGV0IG1lbnUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpO1xyXG4gICAgbWVudS5jbGFzc0xpc3QuYWRkKCdjb2x1bW4tY2hvb3Nlci1tZW51JywgJ2NvbHVtbi1jaG9vc2VyJyk7XHJcbiAgICBsZXQgbWVudUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgbWVudUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdjb2x1bW4tY2hvb3Nlci1tZW51LWNvbnRhaW5lcicsICdoaWRkZW4nKVxyXG4gICAgY29uc29sZS5sb2coKG5ldyBTZXQoYWxsSGVhZGVyKSkudW5pb24odGFibGUuaGlkZGVuQ29sdW1ucykpO1xyXG4gICAgKChuZXcgU2V0KGFsbEhlYWRlcikpLnVuaW9uKHRhYmxlLmhpZGRlbkNvbHVtbnMpKS5mb3JFYWNoKGNvbHVtbiA9PiB7XHJcbiAgICAgIG1lbnUuYXBwZW5kKGNyZWF0ZUNvbHVtbkNob29zZXJNZW51SXRlbXModGFibGUsIGNvbHVtbikpO1xyXG4gICAgfSlcclxuICAgIG1lbnVDb250YWluZXIuYXBwZW5kKG1lbnUpXHJcbiAgICAvLyB0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyTWVudUNvbnRhaW5lciA9IG1lbnVDb250YWluZXI7XHJcbiAgICByZXR1cm4gbWVudUNvbnRhaW5lcjtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG9uQ29sdW1uQ2hvb3NlckJ1dHRvbkhhbmRsZXIodGFibGUsIGV2ZW50KXtcclxuICAgIGxldCBvZmZzZXQgPSB0YWJsZS5vZmZzZXRMZWZ0O1xyXG5cclxuICAgIGlmKHRhYmxlLmVsZW1lbnRzLnRvdGFsX3Jvd3Mpe1xyXG4gICAgICBvZmZzZXQgKz0gdGFibGUuZWxlbWVudHMudG90YWxfcm93cy5vZmZzZXRXaWR0aDtcclxuICAgIH1cclxuICAgIGlmKHRhYmxlLmVsZW1lbnRzLmZpbHRlcmVkX3Jvd19jb3VudCl7XHJcbiAgICAgIG9mZnNldCArPSB0YWJsZS5lbGVtZW50cy5maWx0ZXJlZF9yb3dfY291bnQub2Zmc2V0V2lkdGg7XHJcbiAgICB9XHJcblxyXG4gICAgdGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3Nlck1lbnVDb250YWluZXIuc3R5bGUubGVmdCA9IGAke29mZnNldH1weGA7XHJcblxyXG4gICAgbGV0IGNsYXNzTGlzdCA9IHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJNZW51Q29udGFpbmVyLmNsYXNzTGlzdDtcclxuICAgIGlmKGNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJykpe1xyXG4gICAgICBjbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcclxuICAgICAgdGFibGUucm9vdF9kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGJvdW5kQ29sdW1uQ2hvb3Nlck91dHNpZGVIYW5kbGVyKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY2xhc3NMaXN0LmFkZCgnaGlkZGVuJylcclxuICAgICAgdGFibGUucm9vdF9kb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGJvdW5kQ29sdW1uQ2hvb3Nlck91dHNpZGVIYW5kbGVyKVxyXG4gICAgfVxyXG5cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG9uQ29sdW1uQ2hvb3Nlck91dHNpZGVIYW5kbGVyKHRhYmxlLCBldmVudCl7XHJcbiAgICBpZighZXZlbnQuc3JjRWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2NvbHVtbi1jaG9vc2VyJykpe1xyXG4gICAgICBpZighZXZlbnQuc3JjRWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2Zvb3Rlci1idXR0b24nKSl7XHJcbiAgICAgICAgbGV0IGNsYXNzTGlzdCA9IHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJNZW51Q29udGFpbmVyLmNsYXNzTGlzdDtcclxuICAgICAgICBjbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcclxuICAgICAgICB0YWJsZS5yb290X2RvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYm91bmRDb2x1bW5DaG9vc2VyT3V0c2lkZUhhbmRsZXIpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG9uQ29sdW1uQ2hvb3NlckNoYW5nZUNvbHVtbkhhbmRsZXIodGFibGUsIGNvbHVtbiwgZXZlbnQpe1xyXG4gICAgaWYoZXZlbnQuc3JjRWxlbWVudC5jaGVja2VkKXtcclxuICAgICAgdGFibGUuaGlkZGVuQ29sdW1ucyA9IHRhYmxlLmhpZGRlbkNvbHVtbnMuZmlsdGVyKGVudHJ5ID0+IGVudHJ5ICE9IGNvbHVtbik7XHJcbiAgICAgIHRhYmxlLnZpc2libGVDb2x1bW5zLnB1c2goY29sdW1uKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRhYmxlLmhpZGRlbkNvbHVtbnMucHVzaChjb2x1bW4pO1xyXG4gICAgICB0YWJsZS52aXNpYmxlQ29sdW1ucyA9IHRhYmxlLnZpc2libGVDb2x1bW5zLmZpbHRlcihlbnRyeSA9PiBlbnRyeSAhPT0gY29sdW1uKTtcclxuICAgIH1cclxuICAgIHRhYmxlLnNlcmlhbGl6ZUxpbmtPcHRpb25zKCk7XHJcbiAgICB0YWJsZS5yZWRyYXdUYWJsZSgpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZmlsbERhdGEodGFibGUsIGRhdGEpe1xyXG4gICAgdGFibGUuZWxlbWVudHMuZGF0YUNlbGxzID0ge307XHJcbiAgICBkYXRhLmZvckVhY2goKHJvdywgcm93SW5kZXgpID0+IHtcclxuICAgICAgdGFibGUuaGVhZGVyLmZvckVhY2goIChjb2x1bW4sIGNvbHVtbkluZGV4KSA9PiB7XHJcbiAgICAgICAgbGV0IGNlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICBjZWxsLmNsYXNzTGlzdC5hZGQoJ3dndC1jZWxsJywgJ3dndC1kYXRhLWNlbGwnLCBgd2d0LWNvbHVtbl8ke2NvbHVtbi5zcGxpdCgnICcpLmpvaW4oJ18nKX1gLCBgd2d0LXJvd18ke3Jvd0luZGV4fWAsIGB3Z3QtemVicmFfJHtyb3dJbmRleCAlIDJ9YCk7XHJcbiAgICAgICAgaWYoY29sdW1uLmluY2x1ZGVzKCfigqwnKSkgY2VsbC5jbGFzc0xpc3QuYWRkKCd3Z3QtZGF0YS1jZWxsLW1vbmV5Jyk7XHJcbiAgICAgICAgLy8gY2VsbC5jbGFzc0xpc3QuYWRkKClcclxuICAgICAgICAvLyBjZWxsLmNsYXNzTGlzdC5hZGQoKVxyXG4gICAgICAgIGNlbGwuaW5uZXJIVE1MID0gcm93W2NvbHVtbl0gIT0gdW5kZWZpbmVkID8gcm93W2NvbHVtbl0gOiAnJztcclxuICAgICAgICAvLyBpZihjb2x1bW4gPT09ICcjaW5jbHVkZScpIHtcclxuICAgICAgICAvLyAgIGNlbGwuc2V0QXR0cmlidXRlKCdjb250ZW50RWRpdGFibGUnLCAndHJ1ZScpO1xyXG4gICAgICAgIC8vICAgbGV0IHRlbXBSb3dBY3RpdmUgPSB7Li4ucm93fTtcclxuICAgICAgICAvLyAgIGRlbGV0ZSB0ZW1wUm93QWN0aXZlWycjaW5jbHVkZSddO1xyXG4gICAgICAgIC8vICAgLy8gY29uc29sZS5sb2codGFibGUudGlja2VkUm93cyk7XHJcbiAgICAgICAgLy8gICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0ZW1wUm93QWN0aXZlKSk7XHJcbiAgICAgICAgLy8gICAvLyBjb25zb2xlLmxvZyh0YWJsZS50aWNrZWRSb3dzLmluY2x1ZGVzKEpTT04uc3RyaW5naWZ5KHRlbXBSb3dBY3RpdmUpKSk7XHJcbiAgICAgICAgLy8gICBjZWxsLmlubmVyVGV4dCA9IHRhYmxlLnRpY2tlZFJvd3MuaW5jbHVkZXMoSlNPTi5zdHJpbmdpZnkodGVtcFJvd0FjdGl2ZSkpID8gJ3gnIDogJyc7XHJcbiAgICAgICAgLy8gICBjZWxsLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGV2ZW50KSA9PiB7ICAgICAgIFxyXG4gICAgICAgIC8vICAgICAvLyBjb25zb2xlLmxvZygnaW5wdXQgY2hhbmdlZCBpbiByb3cgJyArIHJvd0luZGV4KTsgICAgIFxyXG4gICAgICAgIC8vICAgICAvLyBjb25zb2xlLmxvZyhldmVudC50YXJnZXQuaW5uZXJUZXh0KTtcclxuICAgICAgICAvLyAgICAgbGV0IHRlbXBSb3cgPSB7Li4ucm93fTtcclxuICAgICAgICAvLyAgICAgZGVsZXRlIHRlbXBSb3dbJyNpbmNsdWRlJ107XHJcbiAgICAgICAgLy8gICAgIGlmKGV2ZW50LnRhcmdldC5pbm5lclRleHQpe1xyXG4gICAgICAgIC8vICAgICAgIC8vIGNvbnNvbGUubG9nKCdhZGRlZCByb3cnKTtcclxuICAgICAgICAvLyAgICAgICB0YWJsZS50aWNrZWRSb3dzLnB1c2goIEpTT04uc3RyaW5naWZ5KHRlbXBSb3cpKTtcclxuICAgICAgICAvLyAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyAgICAgICAvLyBjb25zb2xlLmxvZygncmVtb3ZlZCByb3cnKTtcclxuICAgICAgICAvLyAgICAgICB0YWJsZS50aWNrZWRSb3dzID0gdGFibGUudGlja2VkUm93cy5maWx0ZXIodmFsdWUgPT4gKHZhbHVlICE9PSBKU09OLnN0cmluZ2lmeSh0ZW1wUm93KSkpO1xyXG4gICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgLy8gICAgIHRhYmxlLnNlcmlhbGl6ZUxpbmtPcHRpb25zKCk7XHJcbiAgICAgICAgLy8gICB9KTtcclxuICAgICAgICAvLyB9XHJcbiAgICAgICAgaWYoIXRhYmxlLmVsZW1lbnRzLmRhdGFDZWxsc1tjb2x1bW5dKSB0YWJsZS5lbGVtZW50cy5kYXRhQ2VsbHNbY29sdW1uXSA9IFtdO1xyXG4gICAgICAgIHRhYmxlLmVsZW1lbnRzLmRhdGFDZWxsc1tjb2x1bW5dLnB1c2goY2VsbCk7XHJcbiAgICAgICAgdGFibGUuYXBwZW5kKGNlbGwpXHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVhZCB0aGUgY29sdW1uIG5hbWVzIChoZWFkZXIpIGZyb20gdGhlIGRhdGEsIGlmIHRoZXkgYXJlIG5vdCBzdXBwbHllZC4gXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHtBcnJheTxPYmplY3Q+fSBkYXRhIFxyXG4gICAqIEByZXR1cm5zIHtBcnJheTxzdHJpbmc+fSB0aGUgbGlzdCBvZiBjb2x1bW4gbmFtZXMuXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZ2VuZXJhdGVIZWFkZXIoZGF0YSl7XHJcbiAgICByZXR1cm4gZGF0YS5tYXAoT2JqZWN0LmtleXMpLnJlZHVjZSgoY29sLCBjdXIpID0+IHtcclxuICAgICAgbGV0IHJlc3VsdCA9IGNvbDtcclxuICAgICAgY3VyLmZvckVhY2godmFsdWUgPT4ge1xyXG4gICAgICAgIGlmKCFjb2wuaW5jbHVkZXModmFsdWUpKSByZXN1bHQucHVzaCh2YWx1ZSlcclxuICAgICAgfSlcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0sIFtdKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwbHlDb25kaXRpb25hbENvbHVtblN0eWxpbmcodGFibGUsIGRhdGEsIGhlYWRlciwgY29uZGl0aW9uYWxDb2x1bW5TdHlsZSwgb3B0aW9ucyl7XHJcbiAgICBpZihvcHRpb25zLmFjdGl2ZSl7XHJcbiAgICAgIGxldCBjb2x1bW5fc3R5bGVfZWxlbWVudCA9IHRhYmxlLmVsZW1lbnRzLmNvbHVtblN0eWxlO1xyXG4gICAgICBpZighY29sdW1uX3N0eWxlX2VsZW1lbnQpe1xyXG4gICAgICAgIHRhYmxlLmVsZW1lbnRzLmNvbHVtblN0eWxlID0gY29sdW1uX3N0eWxlX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgIGNvbHVtbl9zdHlsZV9lbGVtZW50LnR5cGUgPSBcInRleHQvY3NzXCI7XHJcbiAgICAgICAgY29sdW1uX3N0eWxlX2VsZW1lbnQuY2xhc3NMaXN0LmFkZCgnY29sdW1uX3N0eWxlcycpO1xyXG4gICAgICAgIHRhYmxlLnJvb3RfZG9jdW1lbnQuaGVhZC5hcHBlbmQoY29sdW1uX3N0eWxlX2VsZW1lbnQpO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbHVtbl9zdHlsZV9lbGVtZW50LmlubmVySFRNTCA9ICcnO1xyXG4gICAgICBoZWFkZXIuZm9yRWFjaChjb2x1bW4gPT4ge1xyXG4gICAgICAgIGNvbmRpdGlvbmFsQ29sdW1uU3R5bGUuZm9yRWFjaCgoY29uZGl0aW9uYWxTdHlsZSkgPT4ge1xyXG4gICAgICAgICAgaWYoY29uZGl0aW9uYWxTdHlsZS5jb25kaXRpb24oZGF0YSwgY29sdW1uKSl7XHJcbiAgICAgICAgICAgIGNvbHVtbl9zdHlsZV9lbGVtZW50LmlubmVySFRNTCArPSBgXHJcbiAgICAgICAgICAgICAgZGl2LndndC1jb2x1bW5fJHtjb2x1bW59LndndC1kYXRhLWNlbGwge1xyXG4gICAgICAgICAgICAgICAgJHtjb25kaXRpb25hbFN0eWxlLnN0eWxlcy5qb2luKCdcXG4nKX1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGBcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwbHlDb25kaXRpb25hbFJvd1N0eWxpbmcodGFibGUsIGRhdGEsIGhlYWRlciwgY29uZGl0aW9uYWxSb3dTdHlsZSwgb3B0aW9ucyl7XHJcbiAgICBpZihvcHRpb25zLmFjdGl2ZSl7XHJcbiAgICAgIGxldCByb3dfc3R5bGVfZWxlbWVudCA9IHRhYmxlLmVsZW1lbnRzLmNvbHVtblN0eWxlO1xyXG4gICAgICBpZighcm93X3N0eWxlX2VsZW1lbnQpe1xyXG4gICAgICAgIHRhYmxlLmVsZW1lbnRzLmNvbHVtblN0eWxlID0gcm93X3N0eWxlX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgIHJvd19zdHlsZV9lbGVtZW50LnR5cGUgPSBcInRleHQvY3NzXCI7XHJcbiAgICAgICAgcm93X3N0eWxlX2VsZW1lbnQuY2xhc3NMaXN0LmFkZCgncm93X3N0eWxlcycpO1xyXG4gICAgICAgIHRhYmxlLnJvb3RfZG9jdW1lbnQuaGVhZC5hcHBlbmQocm93X3N0eWxlX2VsZW1lbnQpO1xyXG4gICAgICB9XHJcbiAgICAgIHJvd19zdHlsZV9lbGVtZW50LmlubmVySFRNTCA9ICcnO1xyXG4gICAgICBPYmplY3Qua2V5cyhjb25kaXRpb25hbFJvd1N0eWxlKS5mb3JFYWNoKGNvbHVtbiA9PiB7XHJcbiAgICAgICAgZGF0YS5mb3JFYWNoKChyb3csIHJvd19pbmRleCkgPT4ge1xyXG4gICAgICAgICAgY29uZGl0aW9uYWxSb3dTdHlsZVtjb2x1bW5dLmZvckVhY2goY29uZGl0aW9uYWxTdHlsZSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGNvbmRpdGlvbmFsU3R5bGUuY29uZGl0aW9uKHJvd1tjb2x1bW5dLCByb3dfaW5kZXgpKXtcclxuICAgICAgICAgICAgICByb3dfc3R5bGVfZWxlbWVudC5pbm5lckhUTUwgKz0gYGRpdiR7Y29uZGl0aW9uYWxTdHlsZS5mdWxscm93ID8gJycgOiBgLndndC1jb2x1bW5fJHtjb2x1bW59YH0ud2d0LXJvd18ke3Jvd19pbmRleH0ge1xcbmBcclxuICAgICAgICAgICAgICByb3dfc3R5bGVfZWxlbWVudC5pbm5lckhUTUwgKz0gY29uZGl0aW9uYWxTdHlsZS5zdHlsZXMuam9pbignXFxuJylcclxuICAgICAgICAgICAgICByb3dfc3R5bGVfZWxlbWVudC5pbm5lckhUTUwgKz0gJ1xcbn0nXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSkgXHJcbiAgICAgIH0pXHJcbiAgICAgIC8vIHRhYmxlLnJvb3RfZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaGVhZCcpLmFwcGVuZChyb3dfc3R5bGVfZWxlbWVudClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlc2V0U29ydGluZyh0YWJsZSl7XHJcbiAgICB0YWJsZS5zb3J0ZWREYXRhID0gdGFibGUuZGF0YSA/IHRhYmxlLmRhdGEubWFwKHZhbHVlID0+IHZhbHVlKSA6IFtdO1xyXG4gICAgdGFibGUuc29ydGVkQnkgPSBbXTtcclxuICAgIGlmKHRhYmxlLmhlYWRlcikgdGFibGUuaGVhZGVyLmZvckVhY2goY29sdW1uID0+IHtcclxuICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLmlubmVySFRNTCA9ICcmIzg2OTM7JztcclxuICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLmFycm93QWxwaGFDb2xvciA9IDEuMDtcclxuICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLnN0eWxlLmNvbG9yID0gYGxpZ2h0Z3JheWA7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlc2V0RmlsdGVyT3BlcmF0aW9ucyh0YWJsZSl7XHJcbiAgICB0YWJsZS5oZWFkZXIuZm9yRWFjaChjb2x1bW4gPT4ge1xyXG4gICAgICBsZXQgb3BlcmF0aW9uID0gdGFibGUuZmlsdGVyT3BlcmF0aW9ucy5maW5kKG9wID0+IChvcC5uYW1lID09IHRhYmxlLmFjdGl2ZUZpbHRlck9wZXJhdGlvbnNbY29sdW1uXSkpO1xyXG4gICAgICBpZihvcGVyYXRpb24pIHRhYmxlLmVsZW1lbnRzLmZpbHRlck9wZXJhdGlvbnNbY29sdW1uXS5pbm5lckhUTUwgPSBvcGVyYXRpb24uY2hhcjtcclxuICAgIH0pOyAgICBcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNvcnRzIHRoZSBkYXRhLCBiZSB0aGUgc3BjaWZpZWQgc29ydGluZyAodGFibGUuc29ydGVkQnkpLlxyXG4gICAqIEBwYXJhbSB7VGFibGVDb21wb25lbnR9IHRhYmxlIHJlZmVyZW5jZSB0byBUYWJsZUNvbXBvbmVudFxyXG4gICAqIEByZXR1cm5zIHtPYmplY3RbXX0gc29ydGVkIGRhdGFcclxuICAgKi9cclxuICBmdW5jdGlvbiBhcHBseVNvcnRpbmcodGFibGUpe1xyXG4gICAgLy8gaWYoY29sdW1uKSB7XHJcbiAgICAvLyAgIHJldHVybiB0YWJsZS5zb3J0ZWREYXRhLnNvcnQoKGEsIGIpID0+IHtcclxuICAgIC8vICAgICByZXR1cm4gdGFibGUuY3VzdG9tQ2hvb3NlU29ydHNDb21wYXJlRm4odGFibGUsIHRhYmxlLnNvcnRlZERhdGEsIGNvbHVtbikoYVtjb2x1bW5dLCBiW2NvbHVtbl0pXHJcbiAgICAvLyAgIH0pXHJcbiAgICAvLyB9IGVsc2UgXHJcbiAgICBpZih0YWJsZS5zb3J0ZWRCeSAmJiB0YWJsZS5zb3J0ZWRCeS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbHVtbiA9IHRhYmxlLnNvcnRlZEJ5WzBdLmNvbDtcclxuICAgICAgbGV0IHNvcnRlZCA9IHRhYmxlLnNvcnRlZERhdGEuc29ydCgoYSwgYikgPT4ge1xyXG4gICAgICAgIHJldHVybiB0YWJsZS5jdXN0b21DaG9vc2VTb3J0c0NvbXBhcmVGbih0YWJsZSwgdGFibGUuZGF0YSwgY29sdW1uKShhW2NvbHVtbl0sIGJbY29sdW1uXSlcclxuICAgICAgfSlcclxuICAgICAgaWYodGFibGUuc29ydGVkQnlbMF0uZGlyID09PSAnZGVzYycpXHJcbiAgICAgICAgc29ydGVkID0gW10uY29uY2F0KHNvcnRlZC5maWx0ZXIoZW50cnkgPT4gZW50cnlbY29sdW1uXSAhPSB1bmRlZmluZWQgJiYgZW50cnlbY29sdW1uXSAhPT0gJycpLnJldmVyc2UoKSwgc29ydGVkLmZpbHRlcihlbnRyeSA9PiBlbnRyeVtjb2x1bW5dID09IHVuZGVmaW5lZCB8fCBlbnRyeVtjb2x1bW5dID09PSAnJykpO1xyXG4gICAgICByZXR1cm4gc29ydGVkO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHRhYmxlLnNvcnRlZERhdGE7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBhcHBseUZpbHRlcih0YWJsZSwgZGF0YSwgaGVhZGVyLCBmaWx0ZXIsIG9wdGlvbnMpe1xyXG4gICAgaWYob3B0aW9ucy5hY3RpdmUpe1xyXG4gICAgICByZXR1cm4gZGF0YS5maWx0ZXIocm93ID0+IFxyXG4gICAgICAgIGhlYWRlci5tYXAoY29sdW1uID0+IHtcclxuICAgICAgICAgIGlmKGZpbHRlcltjb2x1bW5dKXtcclxuICAgICAgICAgICAgaWYgKHRhYmxlLmFjdGl2ZUZpbHRlck9wZXJhdGlvbnNbY29sdW1uXSA9PSAnJyB8fCB0YWJsZS5hY3RpdmVGaWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0gPT0gdW5kZWZpbmVkKSB0YWJsZS5hY3RpdmVGaWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0gPSB0YWJsZS5maWx0ZXJPcGVyYXRpb25zWzBdLm5hbWU7XHJcbiAgICAgICAgICAgIHJldHVybiB0YWJsZS5maWx0ZXJPcGVyYXRpb25zLmZpbmQob3AgPT4gKG9wLm5hbWUgPT0gdGFibGUuYWN0aXZlRmlsdGVyT3BlcmF0aW9uc1tjb2x1bW5dKSkuZm4oZmlsdGVyW2NvbHVtbl0sIHJvd1tjb2x1bW5dKTtcclxuICAgICAgICAgIH0gZWxzZSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9KS5yZWR1Y2UoKGNvbCwgY3VyKSA9PiAoY29sICYmIGN1ciksIHRydWUpXHJcbiAgICAgIClcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwbHlGb3JtYXR0ZXIoZGF0YSwgaGVhZGVyLCBmb3JtYXR0ZXIsIG9wdGlvbnMpe1xyXG4gICAgaWYob3B0aW9ucy5hY3RpdmUpe1xyXG4gICAgICAvLyBjb25zb2xlLmxvZyhoZWFkZXIpO1xyXG4gICAgICByZXR1cm4gZGF0YS5tYXAoKHJvdywgcm93TnIsIGRhdGFSZWFkT25seSkgPT4ge1xyXG4gICAgICAgIGxldCBmb3JtYXR0ZWRSb3cgPSByb3c7IFxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGhlYWRlcik7XHJcbiAgICAgICAgaGVhZGVyLmZvckVhY2goY29sdW1uID0+IHtcclxuICAgICAgICAgIC8vIGlmKGNvbHVtbiA9PT0gJyNpbmNsdWRlJyAmJiByb3dOciA9PT0gMCl7XHJcbiAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKCdpbmNsdWRlIDAnLCByb3csIHJvd1tjb2x1bW5dLCBmb3JtYXR0ZXJbY29sdW1uXSk7XHJcbiAgICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgICAgaWYoZm9ybWF0dGVyW2NvbHVtbl0pe1xyXG4gICAgICAgICAgICBmb3JtYXR0ZWRSb3dbY29sdW1uXSA9IGZvcm1hdHRlcltjb2x1bW5dLnJlZHVjZSgoY29sLCBjdXIpID0+IGN1cihjb2wsIHJvd05yLCBkYXRhUmVhZE9ubHkpLCByb3dbY29sdW1uXSkvLy50b1N0cmluZygpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZm9ybWF0dGVkUm93W2NvbHVtbl0gPSByb3dbY29sdW1uXVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIGlmKGNvbHVtbiA9PT0gJyNpbmNsdWRlJyAmJiByb3dOciA9PT0gMCl7XHJcbiAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKCdpbmNsdWRlIDAnLCBmb3JtYXR0ZWRSb3cpO1xyXG4gICAgICAgICAgLy8gfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJvdztcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZGF0YTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGx5UGFnaW5hdGlvbih0YWJsZSwgZGF0YSl7XHJcbiAgICBsZXQgcmVzdWx0ID0gZGF0YTtcclxuICAgIHRhYmxlLnBhZ2luYXRpb24uYWN0aXZlID0gdGFibGUucGFnaW5hdGlvbk9wdGlvbnMuYWN0aXZlO1xyXG4gICAgdGFibGUucGFnaW5hdGlvbi50b3RhbFBhZ2VzID0gdGFibGUucGFnaW5hdGlvbi5hY3RpdmUgPyBNYXRoLmNlaWwoZGF0YS5sZW5ndGggLyB0YWJsZS5wYWdpbmF0aW9uLnBhZ2VTaXplKSA6IDE7XHJcbiAgICBpZih0YWJsZS5wYWdpbmF0aW9uLnRvdGFsUGFnZXMgPT0gMSl7XHJcbiAgICAgIHRhYmxlLnBhZ2luYXRpb24uYWN0aXZlID0gZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXN1bHQgPSBkYXRhLmZpbHRlcigodmFsdWUsIGluZGV4KSA9PiBcclxuICAgICAgICAhdGFibGUucGFnaW5hdGlvbi5hY3RpdmVcclxuICAgICAgICB8fCAoKGluZGV4ID49ICh0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlIC0gMSkgKiB0YWJsZS5wYWdpbmF0aW9uLnBhZ2VTaXplKSBcclxuICAgICAgICAmJiAoaW5kZXggPCAodGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSkgKiB0YWJsZS5wYWdpbmF0aW9uLnBhZ2VTaXplKSlcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBkcmF3VGFibGUodGFibGUpe1xyXG4gICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93cyA9IHt9O1xyXG5cclxuICAgIC8vIHRhYmxlLmRhdGEgPSB0YWJsZS5kYXRhLm1hcChlbnRyeSA9PiB7XHJcbiAgICAvLyAgIGxldCB0ZW1wUm93ID0gZW50cnk7XHJcbiAgICAvLyAgIGRlbGV0ZSB0ZW1wUm93WycjaW5jbHVkZSddO1xyXG4gICAgLy8gICByZXR1cm4geycjaW5jbHVkZSc6IHRhYmxlLm9wdGlvbnMudGlja2VkUm93cy5pbmNsdWRlcyhKU09OLnN0cmluZ2lmeSh0ZW1wUm93KSkgPyAneCcgOiAnJywgLi4udGVtcFJvd307XHJcbiAgICAvLyB9KTtcclxuICAgIFxyXG5cclxuICAgIHRhYmxlLmRyYXdPcHRpb25hbHMgPSB7XHJcbiAgICAgIGhlYWRlcjogIXRhYmxlLmhhc0F0dHJpYnV0ZSgnbm9oZWFkZXInKSxcclxuICAgICAgZmlsdGVyOiAhdGFibGUuaGFzQXR0cmlidXRlKCdub2ZpbHRlcicpLCAvLyEgVE9ETyBmaXggQnJva2VuIG5vZmlsdGVyXHJcbiAgICAgIGZvb3RlcjogIXRhYmxlLmhhc0F0dHJpYnV0ZSgnbm9mb290ZXInKSxcclxuICAgICAgcGFnZWtleTogIXRhYmxlLmhhc0F0dHJpYnV0ZSgnbm9wYWdla2V5JyksXHJcbiAgICAgIHJld3JpdGV1cmw6ICF0YWJsZS5oYXNBdHRyaWJ1dGUoJ25vcmV3cml0ZXVybCcpLFxyXG4gICAgfVxyXG4gICAgXHJcbiAgICB0YWJsZS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgaWYoIXRhYmxlLmRhdGEpIHRhYmxlLmRhdGEgPSBbXTsgICAgICBcclxuICAgIGlmKCF0YWJsZS5zb3J0ZWREYXRhKSB0YWJsZS5zb3J0ZWREYXRhID0gdGFibGUuZGF0YS5tYXAodmFsdWUgPT4gdmFsdWUpO1xyXG5cclxuICAgIGlmKCF0YWJsZS5oZWFkZXJBbGwgJiYgdGFibGUuZGF0YS5sZW5ndGggPiAwKXtcclxuICAgICAgbGV0IGdlbkhlYWRlciA9IGdlbmVyYXRlSGVhZGVyKHRhYmxlLmRhdGEpO1xyXG4gICAgICBjb25zb2xlLmxvZygnZ2VuaGVhZGVyJywgZ2VuSGVhZGVyKTtcclxuICAgICAgLy8gaWYoIWdlbkhlYWRlci5pbmNsdWRlcygnI2luY2x1ZGUnKSkgdGFibGUuaGVhZGVyQWxsID0gWycjaW5jbHVkZSddLmNvbmNhdChnZW5IZWFkZXIpO1xyXG4gICAgICB0YWJsZS5oZWFkZXJBbGwgPSBnZW5IZWFkZXI7XHJcblxyXG4gICAgICBcclxuICAgICAgdGFibGUuaGlkZGVuQ29sdW1ucyA9IHRhYmxlLmhpZGRlbkNvbHVtbnMuY29uY2F0KHRhYmxlLmhlYWRlckFsbC5maWx0ZXIoY29sdW1uID0+XHJcbiAgICAgICAgdGFibGUuaGlkZGVuQ29sdW1uc0NvbmRpdGlvblxyXG4gICAgICAgICAgLm1hcChjb25kaXRpb24gPT4gKHtjb2w6IGNvbHVtbiwgaGlkZGVuOiBjb25kaXRpb24oY29sdW1uLCB0YWJsZS5kYXRhKX0pKVxyXG4gICAgICAgICAgLmZpbHRlcihjb2x1bW5Db25kID0+IGNvbHVtbkNvbmQuaGlkZGVuKVxyXG4gICAgICAgICAgLm1hcChjb2x1bW5Db25kID0+IGNvbHVtbkNvbmQuY29sKVxyXG4gICAgICAgICAgLmluY2x1ZGVzKGNvbHVtbilcclxuICAgICAgKSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYodGFibGUuaGVhZGVyQWxsICYmIHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJDaGVja2JveCkge1xyXG4gICAgICBmb3IobGV0IGNvbHVtbiBvZiB0YWJsZS5oZWFkZXJBbGwpe1xyXG4gICAgICAgIGlmKHRhYmxlLmhpZGRlbkNvbHVtbnMuaW5jbHVkZXMoY29sdW1uKSAmJiAhdGFibGUudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoY29sdW1uKSl7XHJcbiAgICAgICAgICB0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyQ2hlY2tib3hbY29sdW1uXS5jaGVja2VkID0gZmFsc2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJDaGVja2JveFtjb2x1bW5dLmNoZWNrZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKCdoaWRkZW4gY29sdW1ucycsIHRhYmxlLmhpZGRlbkNvbHVtbnMpO1xyXG5cclxuICAgIGlmKHRhYmxlLmhlYWRlckFsbCl7XHJcbiAgICAgIHRhYmxlLmhlYWRlciA9IFxyXG4gICAgICAgIHRhYmxlLmhlYWRlckFsbC5maWx0ZXIoY29sdW1uID0+IFxyXG4gICAgICAgICAgIXRhYmxlLmhpZGRlbkNvbHVtbnMuaW5jbHVkZXMoY29sdW1uKSB8fCB0YWJsZS52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhjb2x1bW4pXHJcbiAgICAgICAgKVxyXG4gICAgICB0YWJsZS5zdHlsZS5ncmlkVGVtcGxhdGVDb2x1bW5zID0gYHJlcGVhdCgke3RhYmxlLmhlYWRlci5sZW5ndGh9LCBtYXgtY29udGVudClgO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKHRhYmxlLmRyYXdPcHRpb25hbHMuaGVhZGVyICYmIHRhYmxlLmhlYWRlcil7XHJcbiAgICAgIGNyZWF0ZUhlYWRlcih0YWJsZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmKHRhYmxlLmRyYXdPcHRpb25hbHMuZmlsdGVyICYmIHRhYmxlLmhlYWRlcil7XHJcbiAgICAgIGNyZWF0ZUZpbHRlcih0YWJsZSwgdGFibGUuaGVhZGVyLCB0YWJsZS5maWx0ZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0YWJsZS5kYXRhLmxlbmd0aCA+IDApe1xyXG4gICAgICAvLyB0YWJsZS5kYXRhID0gdGFibGUuZGF0YTtcclxuICAgICAgdGFibGUuZGlzcGxheWVkRGF0YSA9IGRyYXdEYXRhKHRhYmxlKTtcclxuXHJcbiAgICAgIC8vPyBMb2csIHRoYXQgaXMgc2VuZCB0byBUcmFja2VyIFNlcnZlcjpcclxuICAgICAgY29uc29sZS5sb2coJ0ZpbmlzaGVkIHRyYW5zZm9ybSBvZiBkYXRhLicsIHRhYmxlLmRpc3BsYXllZERhdGEsIGFwcG5hbWUpO1xyXG5cclxuICAgICAgdGFibGUuZWxlbWVudHMucGFnZUNob29zZXIgPSBjcmVhdGVQYWdlQ2hvb3Nlcih0YWJsZSwgdGFibGUuZGlzcGxheWVkRGF0YSk7XHJcblxyXG4gICAgICBpZiAodGFibGUuZHJhd09wdGlvbmFscy5mb290ZXIpIGNyZWF0ZUZvb3Rlcih0YWJsZSwgdGFibGUuZGlzcGxheWVkRGF0YSwgdGFibGUuZWxlbWVudHMucGFnZUNob29zZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0YWJsZS5kcmF3T3B0aW9uYWxzLnBhZ2VrZXkpe1xyXG4gICAgICBhZGRLZXlIYW5kbGVyVG9Eb2N1bWVudCh0YWJsZSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBkcmF3RGF0YSh0YWJsZSl7XHJcbiAgICB0YWJsZS5zb3J0ZWREYXRhID0gYXBwbHlTb3J0aW5nKHRhYmxlKTtcclxuICAgIGFwcGx5Q29uZGl0aW9uYWxDb2x1bW5TdHlsaW5nKHRhYmxlLCB0YWJsZS5zb3J0ZWREYXRhLCB0YWJsZS5oZWFkZXIsIHRhYmxlLmNvbmRpdGlvbmFsQ29sdW1uU3R5bGUsIHRhYmxlLmNvbmRpdGlvbmFsU3R5bGVPcHRpb25zKTtcclxuICAgIGxldCBmb3JtYXR0ZWREYXRhID0gdGFibGUuZm9ybWF0dGVkRGF0YSA9IGFwcGx5Rm9ybWF0dGVyKHRhYmxlLnNvcnRlZERhdGEsIHRhYmxlLmhlYWRlciwgdGFibGUuZm9ybWF0dGVyLCB0YWJsZS5mb3JtYXR0ZXJPcHRpb25zKTtcclxuICAgIGxldCBmaWx0ZXJlZERhdGEgPSB0YWJsZS5maWx0ZXJlZERhdGEgPSBhcHBseUZpbHRlcih0YWJsZSwgZm9ybWF0dGVkRGF0YSwgdGFibGUuaGVhZGVyLCB0YWJsZS5maWx0ZXIsIHRhYmxlLmZpbHRlck9wdGlvbnMpO1xyXG4gICAgdGFibGUucGFnaW5hdGlvbi5maWx0ZXJlZERhdGFDb3VudCA9IGZpbHRlcmVkRGF0YS5sZW5ndGg7XHJcbiAgICBsZXQgcGFnZWluYXRlZERhdGEgPSB0YWJsZS5wYWdlaW5hdGVkRGF0YSA9IGFwcGx5UGFnaW5hdGlvbih0YWJsZSwgZmlsdGVyZWREYXRhKTtcclxuICAgIGNvbnNvbGUubG9nKHtcclxuICAgICAgJ2hlYWRlcic6IHRhYmxlLmhlYWRlcixcclxuICAgICAgJ3NvcnRlZCBkYXRhJzogdGFibGUuc29ydGVkRGF0YSwgXHJcbiAgICAgICdmb3JtYXR0ZWQgZGF0YSc6IGZvcm1hdHRlZERhdGEsXHJcbiAgICAgICdmaWx0ZXJlZCBkYXRhJzogZmlsdGVyZWREYXRhLFxyXG4gICAgICAncGFnaW5hdGVkIGRhdGEnOiBwYWdlaW5hdGVkRGF0YVxyXG4gICAgfSk7XHJcbiAgICAvLyBwYWdlaW5hdGVkRGF0YSA9IHBhZ2VpbmF0ZWREYXRhLm1hcChlbnRyeSA9PiAoeycjaW5jbHVkZSc6IHRhYmxlLnRpY2tlZFJvd3MuaW5jbHVkZXMoSlNPTi5zdHJpbmdpZnkoZW50cnkpKSA/ICd4JyA6ICcnLCAuLi5lbnRyeX0pKVxyXG4gICAgdGFibGUuc3R5bGUuZ3JpZFRlbXBsYXRlUm93cyA9IGAke1xyXG4gICAgICB0YWJsZS5kcmF3T3B0aW9uYWxzLmhlYWRlciA/ICdtYXgtY29udGVudCcgOiAnJ30gJHtcclxuICAgICAgICB0YWJsZS5kcmF3T3B0aW9uYWxzLmZpbHRlciA/ICdtYXgtY29udGVudCcgOiAnJ30gcmVwZWF0KCR7cGFnZWluYXRlZERhdGEubGVuZ3RofSwgbWF4LWNvbnRlbnQpICR7XHJcbiAgICAgICAgICB0YWJsZS5kcmF3T3B0aW9uYWxzLmZvb3RlciA/ICdtYXgtY29udGVudCcgOiAnJ31gOyBcclxuICAgIGZpbGxEYXRhKHRhYmxlLCBwYWdlaW5hdGVkRGF0YSk7XHJcbiAgICBhcHBseUNvbmRpdGlvbmFsUm93U3R5bGluZyh0YWJsZSwgcGFnZWluYXRlZERhdGEsIHRhYmxlLmhlYWRlciwgdGFibGUuY29uZGl0aW9uYWxSb3dTdHlsZSwgdGFibGUuY29uZGl0aW9uYWxTdHlsZU9wdGlvbnMpO1xyXG4gICAgcmV0dXJuIHBhZ2VpbmF0ZWREYXRhO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZGVmaW5lSGlkZGVuUHJvcGVydGllcyh0YWJsZSwgcHJvcHMpe1xyXG4gICAgcHJvcHMuZm9yRWFjaChwcm9wID0+IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YWJsZSwgcHJvcCwge1xyXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcclxuICAgICAgd3JpdGFibGU6IHRydWUsXHJcbiAgICAgIC8vIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuICAgIH0pKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZGVmaW5lT3B0aW9uUHJvcGVydGllcyh0YWJsZSwgcHJvcHMpe1xyXG4gICAgcHJvcHMuZm9yRWFjaChwcm9wID0+IFxyXG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFibGUsIHByb3AsIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZnVuUmVnZXggPSAvXigoPzpmdW5jdGlvblxccyouKil7MCwxfVxcKChbXlxcKFxce1xcW1xcPVxcPl0qKVxcKVxccyooPzo9PnxcXHspXFxzKltcXHtcXChdezAsMX0uKltcXH1cXCldezAsMX0pJC9neTtcclxuXHJcbiAgZnVuY3Rpb24gZGVzZXJpYWxpemVGdW5jdGlvbihmdW5TdHIpe1xyXG4gICAgbGV0IG1hdGNoID0gZnVuUmVnZXguZXhlYyhmdW5TdHIpO1xyXG4gICAgbGV0IGFyZ3MgPSBtYXRjaC5ncm91cHNbMl0uc3BsaXQoJywnKS5tYXAoc3RyID0+IHN0ci50cmltKCkpXHJcbiAgICByZXR1cm4gbmV3IEZ1bmN0aW9uKC4uLmFyZ3MsIGByZXR1cm4gKCR7ZnVuU3RyLnRvU3RyaW5nKCl9KSgke2FyZ3Muam9pbignLCAnKX0pYClcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNlcmlhbGl6ZUZ1bmN0aW9uKGZ1bil7XHJcbiAgICByZXR1cm4gZnVuLnRvU3RyaW5nKCk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZXBsYWNlVXJsU2VhcmNoUGFyYW1ldGVyKG5ld1BhcmFtS2V5LCBuZXdQYXJhbVZhbHVlKXtcclxuICAgIGxldCByZXN1bHQgPSAnPyc7XHJcbiAgICBsZXQgcmVwbGFjZWQgPSBmYWxzZTtcclxuICAgIGxldCBvbGRQYXJhbXMgPSBsb2NhdGlvbi5zZWFyY2guc2xpY2UoMSkuc3BsaXQoJyYnKVxyXG4gICAgaWYob2xkUGFyYW1zLmxlbmd0aCA+IDEpe1xyXG4gICAgICBvbGRQYXJhbXMuZm9yRWFjaChvbGRQYXJhbSA9PiB7XHJcbiAgICAgICAgbGV0IG9sZFBhcmFtS2V5ID0gb2xkUGFyYW0uc3BsaXQoJz0nKVswXTtcclxuICAgICAgICBpZihvbGRQYXJhbUtleSA9PSBuZXdQYXJhbUtleSkge1xyXG4gICAgICAgICAgcmVwbGFjZWQgPSB0cnVlO1xyXG4gICAgICAgICAgcmVzdWx0ICs9IGAke29sZFBhcmFtS2V5fT0ke25ld1BhcmFtVmFsdWV9JmA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgcmVzdWx0ICs9IGAke29sZFBhcmFtS2V5fT0ke29sZFBhcmFtLnNwbGl0KCc9Jykuc2xpY2UoMSkuam9pbignPScpfSZgO1xyXG4gICAgICB9KVxyXG4gICAgfSBlbHNlIGlmKG9sZFBhcmFtcy5sZW5ndGggPT0gMSl7XHJcbiAgICAgIGlmIChvbGRQYXJhbXNbMF0gPT0gXCJcIil7XHJcbiAgICAgICAgcmVwbGFjZWQgPSB0cnVlO1xyXG4gICAgICAgIHJlc3VsdCArPSBgJHtuZXdQYXJhbUtleX09JHtuZXdQYXJhbVZhbHVlfSZgO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChvbGRQYXJhbXNbMF0uc3BsaXQoJz0nKVswXSA9PSBuZXdQYXJhbUtleSl7XHJcbiAgICAgICAgICByZXBsYWNlZCA9IHRydWU7XHJcbiAgICAgICAgICByZXN1bHQgKz0gYCR7bmV3UGFyYW1LZXl9PSR7bmV3UGFyYW1WYWx1ZX0mYDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmVzdWx0ICs9IGAke29sZFBhcmFtc1swXS5zcGxpdCgnPScpWzBdfT0ke29sZFBhcmFtc1swXS5zcGxpdCgnPScpLnNsaWNlKDEpLmpvaW4oJz0nKX0mYDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICghcmVwbGFjZWQpIHJlc3VsdCArPSBgJHtuZXdQYXJhbUtleX09JHtuZXdQYXJhbVZhbHVlfSZgO1xyXG4gICAgcmV0dXJuIHJlc3VsdC5zbGljZSgwLCAtMSkgKyBsb2NhdGlvbi5oYXNoO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gcmVhcHBseVNvcnRpbmcodGFibGUsIHBhcnRpYWxPcHRpb25zKXtcclxuICAgIGNvbnNvbGUubG9nKCdyZWFwbHkgc29ydGluZycpXHJcbiAgICByZXNldFNvcnRpbmcodGFibGUpO1xyXG4gICAgaWYocGFydGlhbE9wdGlvbnNbJ3NvcnRlZEJ5J10pIHBhcnRpYWxPcHRpb25zWydzb3J0ZWRCeSddLnJldmVyc2UoKS5zbGljZSgtNCkuZm9yRWFjaChzb3J0U3RlcCA9PiB7XHJcbiAgICAgIGlmKHNvcnRTdGVwLmRpciA9PSAnZGVzYycpe1xyXG4gICAgICAgIG9uU29ydENsaWNrKHRhYmxlLCBzb3J0U3RlcC5jb2wpXHJcbiAgICAgIH1cclxuICAgICAgb25Tb3J0Q2xpY2sodGFibGUsIHNvcnRTdGVwLmNvbClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUYWJsZUNvbXBvbmVudCBpcyB0aGUgaW1wbGVtZW50YXRpb24gb2Ygd2MtZ3JpZC10YWJsZSAoc2hvcnQ6IHdndCkuXHJcbiAgICogXHJcbiAgICogVGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgYXJlIGV4cG9zZWQgd2hlbiBjcmVhdGluZyBhIHdndCBIVE1MIGVsZW1lbnQgKGRvY3VtZW50ZWQgaW4gdGhlcmUgcmVzcGVjdGl2ZSBkb2NzdHJpbmcpOlxyXG4gICAqICAtIHVzZURlZmF1bHRPcHRpb25zKClcclxuICAgKiAgLSBjb25uZWN0ZWRDYWxsYmFjaygpXHJcbiAgICogIC0gc2V0RGVib3VuY2VGbihkZWJvdW5jZUZuLCBzb3J0RGVib3VuY2VPcHRpb25zLCBmaWx0ZXJEZWJvdW5jZWRPcHRpb25zKVxyXG4gICAqICAtIHNldERhdGEoZGF0YSlcclxuICAgKiAgLSBnZXREaXNwbGF5ZWREYXRhKClcclxuICAgKiAgLSBnZXRPcmlnaW5hbERhdGEoKVxyXG4gICAqICAtIHJlZHJhd0RhdGEoKVxyXG4gICAqIFxyXG4gICAqIFRoZSBmb2xsb3dpbmcgcHJvcGVydGllcyBjYW4gYmUgYWNjZXNzZWQgZGlyZWN0bHk6XHJcbiAgICogIC0gcm9vdF9kb2N1bWVudCAtIGVpdGhlciBkb2N1bWVudCBvciB0aGUgY29ubmVjdGVkIHNoYWRvd1Jvb3RcclxuICAgKiAgLSBjb25kaXRpb25hbENvbHVtblN0eWxlIC0gYW4gb2JqZWN0IHdpdGgga2V5cyBbXCJjb25kaXRpb25cIiwgXCJzdHlsZXNcIl0gd2hlcmUgY29uZGl0aW9uIGlzIGEgZnVuY3Rpb24gXCIoZGF0YSA6IEFycmF5PE9iamVjdD4gLCBjb2x1bW4gOiBzdHJpbmcpID0+IEJvb2xlYW5cIiBhbmQgc3R5bGVzIGlzXHJcbiAgICogICAgYW4gQXJyYXkgb2Ygc3RyaW5ncyB3aXRoIHN0eWxlcywgdGhhdCBzaG91bGQgYXBwbHkgd2hlbiBcImNvbmRpdGlvblwiIHJldHVybnMgdHJ1ZSBmb3IgYSBjb2x1bW4uXHJcbiAgICogICAgQ2FuIGJlIHVzZWQgdG8gc3R5bGUgYSBjb2x1bW4gaW4gZGVwZW5kZW5jeSBvZiB0aGVpciBkYXRhLiBcclxuICAgKiAgLSBjb25kaXRpb25hbFN0eWxlT3B0aW9ucyAtIGFuIG9iamVjdCB3aXRoIG9wdGlvbnMgY29uY2VybmluZyBjb25kaXRpb25hbENvbHVtblN0eWxlIGFuZCBjb25kaXRpb25hbFJvd1N0eWxlLiBBdmFpbGFibGUgT3B0aW9uczpcclxuICAgKiAgICAgIC0gYWN0aXZlOiBCb29sZWFuXHJcbiAgICogIC0gZm9ybWF0dGVyIC0gYW4gT2JqZWN0IHdpdGggY29sdW1uIG5hbWVzIGFzIGtleXMsIGNvbnRhaW5pbmcgbGlzdHMgb2YgZm9ybWF0dGVyIGZ1bmN0aW9ucywgdGhhdCBzaG91bGQgYmUgYXBwbGllZCBiZWZvcmUgZGlzcGxhaW5nIGEgdGFibGUgdmFsdWUuIEZvcm1hdHRlciBmdW5jdGlvbnNcclxuICAgKiAgICBoYXZlIHRoaXMgc2lnbmF0dXJlOiBcIih2YWx1ZSwgcm93SW5kZXgsIGNvbXBsZXRlRGF0YSkgPT4gYW55XCIuIEZvcm1hdHRlciBnZXQgYXBwbGllZCBpbiB0aGUgc2VxdWVuY2UgdGhleSBhcmUgaW4gdGhlIGxpc3QgKGxlZnRtb3N0IGZ1bmN0aW9uICgybmQgZnJvbSBsZWZ0ICgzcmQgLi4uKSkpLlxyXG4gICAqICAtIGZvcm1hdHRlck9wdGlvbnMgLSBhbiBvYmplY3Qgd2l0aCBvcHRpb25zIGNvbmNlcm5pbmcgZm9ybWF0dGVyLiBBdmFpbGFibGUgT3B0aW9uczpcclxuICAgKiAgICAgIC0gYWN0aXZlOiBCb29sZWFuXHJcbiAgICogIC0gZmlsdGVyIC0gYW4gT2JqZWN0IHdpdGggY29sdW1uIG5hbWVzIGFzIGtleXMsIGNvbnRhaW5pbmcgc3RyaW5ncyB3aGljaCBjb3JyZXNwb25kIHRvIHRoZSBmaWx0ZXIgaW5wdXQgdmFsdWVzIGluIHRoZSB1aS4gXHJcbiAgICogICAgVGhvc2UgZ2V0IHZhbGlkYXRlZCBieSBmaWx0ZXJPcGVyYXRpb25zLmZuLlxyXG4gICAqICAtIGZpbHRlck9wdGlvbnMgLSBhbiBvYmplY3Qgd2l0aCBvcHRpb25zIGNvbmNlcm5pbmcgZmlsdGVyLiBBdmFpbGFibGUgT3B0aW9uczpcclxuICAgKiAgICAgIC0gYWN0aXZlOiBCb29sZWFuXHJcbiAgICogIC0gZmlsdGVyT3BlcmF0aW9ucyAtIGFuIG9iamVjdCB3aXRoIG9wZXJhdGlvbnMsIGZpbHRlcnMgYW5kIGNoYXJzIGZvciBkaWZmZXJlbnQgZmlsdGVyIG9wdGlvbnMgdG9nZ2xlYWJsZS4gYHtDb2x1bW4xOiB7bmFtZTogJ21vZEZpbHRlcicsIGNoYXI6ICclJywgZm46IGZ1bmN0aW9uKGZpbHRlcklucHV0LCB0ZXN0VmFsdWUpfX1gXHJcbiAgICogIC0gc29ydGVkQnkgLSBhbiBBcnJheSBvZiBPYmplY3RzIGRlc2NyaWJpbmcgc29ydGluZy4gS2V5cyBhcmUgY29sIC0gY29sdW1uIG5hbWUgc29ydGVkIC0gYW5kIGRpciAtIHRoZSBzb3J0IGRpcmVjdGlvbiAob25lIG9mIFtcImFzY1wiLCBcImRlc2NcIl0pLiBTb3J0aW5nIGlzIGtlcHQgYWZ0ZXIgZWFjaFxyXG4gICAqICAgIHNvcnRpbmcgb3BlcmF0aW9uLCBzbyB0aGF0IHByaW1hcnksIHNlY29uZGFyeSwgdGVydGlhcnksIC4uLiBzb3J0aW5nIGlzIHBvc3NpYmxlLlxyXG4gICAqICAtIHNvcnRPcHRpb25zIC0gYW4gb2JqZWN0IHdpdGggb3B0aW9ucyBjb25jZXJuaW5nIHNvcnRpbmcuIEF2YWlsYWJsZSBPcHRpb25zOlxyXG4gICAqICAgICAgLSBhY3RpdmU6IEJvb2xlYW5cclxuICAgKiAgLSBjdXN0b21DaG9vc2VTb3J0c0NvbXBhcmVGbiAtIGEgZnVuY3Rpb24gbWFwcyBjb2x1bW5zIHRvIHNvcnRpbmcgYmVoYXZpb3IuIEV4cGVjdGVkIHJldHVybiBmb3IgZ2l2ZW4gKHRhYmxlOiBUYWJsZUNvbXBvbmVudCBpbnN0YW5jZSwgZGF0YTogQXJyYXk8T2JqZWN0PiwgY29sdW1uOiBzdHJpbmcpXHJcbiAgICogICAgaXMgYSBmdW5jdGlvbiB0byBjb21wYXJlIHRoZSB2YWx1ZXMgb2YgdGhpcyBjb2x1bW4uXHJcbiAgICogIC0gY3VzdG9tQ29tcGFyZU51bWJlcnMgLyBjdXN0b21Db21wYXJlVGV4dCAtIGZ1bmN0aW9ucyB0byByZXBsYWNlIGRlZmF1bHQgc29ydCBiZWhhdmlvciBjb3JyZXNwb25pbmcgdG8gc29ydGluZyBudW1iZXJzIC8gdGV4dC4gTGlrZSBkZWZhdWx0IGpzIENvbXBhcmVGbiB1c2VkIGluIEFycmF5LnByb3RvdHlwZS5zb3J0XHJcbiAgICovXHJcbiAgY2xhc3MgVGFibGVDb21wb25lbnQgZXh0ZW5kcyBIVE1MRWxlbWVudHtcclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgIHN1cGVyKCk7XHJcblxyXG4gICAgICBkZWZpbmVTZXRQcm90b3R5cGVGdW5jdGlvbnMoKTtcclxuXHJcbiAgICAgIHRoaXMubGlua09wdGlvbnMgPSBbXHJcbiAgICAgICAgJ3BhZ2luYXRpb24nLFxyXG4gICAgICAgICdmaWx0ZXInLFxyXG4gICAgICAgICdzb3J0ZWRCeScsXHJcbiAgICAgICAgJ2FjdGl2ZUZpbHRlck9wZXJhdGlvbnMnLFxyXG4gICAgICAgICdoaWRkZW5Db2x1bW5zJyxcclxuICAgICAgICAndmlzaWJsZUNvbHVtbnMnLFxyXG4gICAgICAgIC8vICd0aWNrZWRSb3dzJyxcclxuICAgICAgXVxyXG5cclxuICAgICAgZGVmaW5lSGlkZGVuUHJvcGVydGllcyh0aGlzLCBbXHJcbiAgICAgICAgJ29wdGlvbnMnLFxyXG4gICAgICAgICdyb290X2RvY3VtZW50JyxcclxuICAgICAgICAnb3B0aW9uYWxEZWJvdW5jZUZuJyxcclxuICAgICAgICAnc29ydGVkRGF0YScsXHJcbiAgICAgICAgJ2RhdGEnLFxyXG4gICAgICAgICdoZWFkZXInLFxyXG4gICAgICAgICdkaXNwbGF5ZWREYXRhJyxcclxuICAgICAgICAnZHJhd09wdGlvbmFscycsXHJcbiAgICAgICAgJ2VsZW1lbnRzJyxcclxuICAgICAgICAndGFibGVJZCcsXHJcbiAgICAgICAgJ3BsdWdpbnMnLFxyXG4gICAgICBdKTtcclxuXHJcbiAgICAgIHRoaXMub3B0aW9ucyA9IHt9XHJcblxyXG4gICAgICBkZWZpbmVPcHRpb25Qcm9wZXJ0aWVzKHRoaXMsIFtcclxuICAgICAgICAnY29uZGl0aW9uYWxDb2x1bW5TdHlsZScsXHJcbiAgICAgICAgJ2NvbmRpdGlvbmFsUm93U3R5bGUnLFxyXG4gICAgICAgICdjb25kaXRpb25hbFN0eWxlT3B0aW9ucycsXHJcbiAgICAgICAgJ2Zvcm1hdHRlcicsXHJcbiAgICAgICAgJ2Zvcm1hdHRlck9wdGlvbnMnLFxyXG4gICAgICAgICdmaWx0ZXInLFxyXG4gICAgICAgICdmaWx0ZXJPcHRpb25zJyxcclxuICAgICAgICAnZmlsdGVyT3BlcmF0aW9ucycsXHJcbiAgICAgICAgJ2FjdGl2ZUZpbHRlck9wZXJhdGlvbnMnLFxyXG4gICAgICAgICdzb3J0ZWRCeScsXHJcbiAgICAgICAgJ3NvcnRPcHRpb25zJyxcclxuICAgICAgICAncGFnaW5hdGlvbicsXHJcbiAgICAgICAgJ2N1c3RvbUNvbXBhcmVOdW1iZXJzJyxcclxuICAgICAgICAnY3VzdG9tQ29tcGFyZVRleHQnLFxyXG4gICAgICAgICdjdXN0b21DaG9vc2VTb3J0c0NvbXBhcmVGbicsXHJcbiAgICAgICAgJ2hpZGRlbkNvbHVtbnMnLFxyXG4gICAgICAgICdoaWRkZW5Db2x1bW5zQ29uZGl0aW9uJyxcclxuICAgICAgICAndmlzaWJsZUNvbHVtbnMnLFxyXG4gICAgICAgICd0aWNrZWRSb3dzJyxcclxuICAgICAgXSk7XHJcblxyXG4gICAgICB0aGlzLnBsdWdpbnMgPSB7ZGF0YToge319O1xyXG5cclxuICAgICAgdGhpcy51c2VEZWZhdWx0T3B0aW9ucygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVzZXQgT3B0aW9ucyB0byB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uLlxyXG4gICAgICovXHJcbiAgICB1c2VEZWZhdWx0T3B0aW9ucygpe1xyXG4gICAgICB0aGlzLnJvb3RfZG9jdW1lbnQgPSBkb2N1bWVudDtcclxuXHJcbiAgICAgIHRoaXMuZWxlbWVudHMgPSB7fTtcclxuXHJcbiAgICAgIC8vIHRoaXMudGFibGVJZCA9IDA7XHJcbiAgICAgIHRoaXMudGFibGVJZCA9IHRhYmxlQ291bnRlcisrO1xyXG5cclxuICAgICAgdGhpcy5kYXRhID0gW107XHJcbiAgICAgIFxyXG4gICAgICB0aGlzLmhpZGRlbkNvbHVtbnMgPSBbXTsgLy8gWydFaW56ZWxwcmVpcyddO1xyXG4gICAgICB0aGlzLnZpc2libGVDb2x1bW5zID0gW107XHJcbiAgICAgIHRoaXMuaGlkZGVuQ29sdW1uc0NvbmRpdGlvbiA9IFtcclxuICAgICAgICAoY29sdW1uLCBkYXRhKSA9PiAoY29sdW1uLnN0YXJ0c1dpdGgoJyMnKSksXHJcbiAgICAgIF07XHJcblxyXG4gICAgICB0aGlzLmVsZW1lbnRzLnNvcnRBcnJvd3MgPSB7fTtcclxuICAgICAgdGhpcy5vcHRpb25hbERlYm91bmNlRm4gPSB1bmRlZmluZWQ7XHJcbiAgICAgIHRoaXMuYWN0aXZlRmlsdGVyT3BlcmF0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgdGhpcy5wYWdpbmF0aW9uT3B0aW9ucyA9IHtcclxuICAgICAgICBhY3RpdmU6IHRydWUsXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMucGFnaW5hdGlvbiA9IHtcclxuICAgICAgICBhY3RpdmU6IHRydWUsXHJcbiAgICAgICAgY3VycmVudFBhZ2U6IDEsXHJcbiAgICAgICAgcGFnZVNpemU6IDQwLFxyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmZpbHRlck9wZXJhdGlvbnMgPSBbXHJcbiAgICAgICAge25hbWU6ICdjb250YWluc0V4JywgY2hhcjogJyZzdWJlOycsIGZuOiByZWdleEZpbHRlci5iaW5kKG51bGwsIGZhbHNlKX0sIFxyXG4gICAgICAgIHtuYW1lOiAnbm90Q29udGFpbnNFeCcsIGNoYXI6ICcmIzg4NDA7JywgZm46IHJlZ2V4RmlsdGVyLmJpbmQobnVsbCwgdHJ1ZSl9LCBcclxuICAgICAgICB7bmFtZTogJ2VxdWFscycsIGNoYXI6ICc9JywgZm46IGNvbXBhcmVGaWx0ZXIuYmluZChudWxsLCAoYSwgYikgPT4gYSA9PSBiKX0sIFxyXG4gICAgICAgIHtuYW1lOiAnZ3JlYXRlcicsIGNoYXI6ICc+JywgZm46IGNvbXBhcmVGaWx0ZXIuYmluZChudWxsLCAoYSwgYikgPT4gYSA8IGIpfSwgXHJcbiAgICAgICAge25hbWU6ICdncmVhdGVyRXF1YWxzJywgY2hhcjogJyZnZTsnLCBmbjogY29tcGFyZUZpbHRlci5iaW5kKG51bGwsIChhLCBiKSA9PiBhIDw9IGIpfSwgXHJcbiAgICAgICAge25hbWU6ICdsZXNzZXInLCBjaGFyOiAnPCcsIGZuOiBjb21wYXJlRmlsdGVyLmJpbmQobnVsbCwgKGEsIGIpID0+IGEgPiBiKX0sIFxyXG4gICAgICAgIHtuYW1lOiAnbGVzc2VyRXF1YWxzJywgY2hhcjogJyZsZTsnLCBmbjogY29tcGFyZUZpbHRlci5iaW5kKG51bGwsIChhLCBiKSA9PiBhID49IGIpfSwgXHJcbiAgICAgICAge25hbWU6ICd1bkVxdWFscycsIGNoYXI6ICcmbmU7JywgZm46IGNvbXBhcmVGaWx0ZXIuYmluZChudWxsLCAoYSwgYikgPT4gYSAhPSBiKX0sIFxyXG4gICAgICBdXHJcblxyXG4gICAgICB0aGlzLmNvbmRpdGlvbmFsQ29sdW1uU3R5bGUgPSBbXTsgLypbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgY29uZGl0aW9uOiAoZGF0YSwgY29sdW1uKSA9PiAoIU51bWJlci5pc05hTihkYXRhLnJlZHVjZSgoY29sLCBjdXIpID0+IChjb2wgKz0gdHlwZW9mIGN1cltjb2x1bW5dID09PSBcInN0cmluZ1wiID8gTmFOIDogKGN1cltjb2x1bW5dICE9IHVuZGVmaW5lZCA/IGN1cltjb2x1bW5dIDogMCkpLCAwKSkpLFxyXG4gICAgICAgICAgc3R5bGVzOiBbXCJ0ZXh0LWFsaWduOiByaWdodDtcIl1cclxuICAgICAgICB9LFxyXG4gICAgICBdKi9cclxuXHJcbiAgICAgIHRoaXMuY29uZGl0aW9uYWxSb3dTdHlsZSA9IHtcclxuICAgICAgIC8qIFJhYmF0dHNhdHo6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgY29uZGl0aW9uOiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpe1xyXG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA9PSAwICYmIGluZGV4ICUgMiAhPSAwO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdHlsZXM6IFtcImJhY2tncm91bmQtY29sb3I6IGxpZ2h0Y29yYWw7XCIsIFwiY29sb3I6IGJsYWNrO1wiXSxcclxuICAgICAgICAgICAgZnVsbHJvdzogdHJ1ZVxyXG4gICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBjb25kaXRpb246IGZ1bmN0aW9uKHZhbHVlLCBpbmRleCl7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09IDAgJiYgaW5kZXggJSAyID09IDA7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0eWxlczogW1wiYmFja2dyb3VuZC1jb2xvcjogZGFya3NhbG1vbjtcIiwgXCJjb2xvcjogYmxhY2s7XCJdLFxyXG4gICAgICAgICAgICBmdWxscm93OiB0cnVlXHJcbiAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGNvbmRpdGlvbjogZnVuY3Rpb24odmFsdWUsIGluZGV4KXtcclxuICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPiAwICYmIGluZGV4ICUgMiAhPSAwO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdHlsZXM6IFtcImJhY2tncm91bmQtY29sb3I6IGxpZ2h0Z3JlZW47XCIsIFwiY29sb3I6IGJsYWNrO1wiXSxcclxuICAgICAgICAgICAgZnVsbHJvdzogdHJ1ZVxyXG4gICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICBjb25kaXRpb246IGZ1bmN0aW9uKHZhbHVlLCBpbmRleCl7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID4gMCAmJiBpbmRleCAlIDIgPT0gMDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3R5bGVzOiBbXCJiYWNrZ3JvdW5kLWNvbG9yOiBkYXJrc2VhZ3JlZW47XCIsIFwiY29sb3I6IGJsYWNrO1wiXSxcclxuICAgICAgICAgICAgZnVsbHJvdzogdHJ1ZVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF0qL1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmNvbmRpdGlvbmFsU3R5bGVPcHRpb25zID0ge1xyXG4gICAgICAgIFwiYWN0aXZlXCI6IHRydWUsXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZm9ybWF0dGVyID0ge31cclxuICAgICAgdGhpcy5mb3JtYXR0ZXJPcHRpb25zID0ge1xyXG4gICAgICAgIFwiYWN0aXZlXCI6IHRydWUsXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZmlsdGVyID0ge31cclxuICAgICAgdGhpcy5maWx0ZXJPcHRpb25zID0ge1xyXG4gICAgICAgIFwiYWN0aXZlXCI6IHRydWUsXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuc29ydGVkQnkgPSBbXTtcclxuICAgICAgdGhpcy5zb3J0T3B0aW9ucyA9IHtcclxuICAgICAgICBcImFjdGl2ZVwiOiB0cnVlLFxyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuY3VzdG9tQ29tcGFyZU51bWJlcnMgPSBjb21wYXJlTnVtYmVycztcclxuICAgICAgdGhpcy5jdXN0b21Db21wYXJlVGV4dCA9IGNvbXBhcmVUZXh0O1xyXG4gICAgICB0aGlzLmN1c3RvbUNob29zZVNvcnRzQ29tcGFyZUZuID0gY2hvb3NlU29ydHNDb21wYXJlRm47XHJcbiAgICAgIFxyXG4gICAgICB0aGlzLmRyYXdPcHRpb25hbHMgPSB7fTtcclxuXHJcbiAgICAgIHRoaXMudGlja2VkUm93cyA9IFtdO1xyXG4gICAgfVxyXG5cclxuICAgIGxvYWRQYXJ0aWFsT3B0aW9ucyhwYXJ0aWFsT3B0aW9ucyl7XHJcbiAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID4gMCl7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3BhcnRpYWwnLCBwYXJ0aWFsT3B0aW9ucylcclxuICAgICAgICBPYmplY3Qua2V5cyhwYXJ0aWFsT3B0aW9ucykuc29ydCgoYSwgYikgPT4gKGEgPT0gJ2hpZGRlbkNvbHVtbnMnKSA/IDEgOiAtMSkuZm9yRWFjaChvcHRpb24gPT4ge1xyXG4gICAgICAgICAgaWYob3B0aW9uID09ICdzb3J0ZWRCeScpe1xyXG4gICAgICAgICAgICByZWFwcGx5U29ydGluZyh0aGlzLCBwYXJ0aWFsT3B0aW9ucyk7XHJcbiAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbiA9PSAnaGlkZGVuQ29sdW1ucycpIHtcclxuICAgICAgICAgICAgdGhpc1tvcHRpb25dID0gcGFydGlhbE9wdGlvbnNbb3B0aW9uXTtcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXdUYWJsZSgpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpc1tvcHRpb25dID0gcGFydGlhbE9wdGlvbnNbb3B0aW9uXTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cob3B0aW9uLCB0aGlzW29wdGlvbl0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJlc2V0RmlsdGVyT3BlcmF0aW9ucyh0aGlzKVxyXG4gICAgICAgIHRoaXMucmVkcmF3RGF0YSgpXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemVMaW5rT3B0aW9ucygpe1xyXG4gICAgICBsZXQgbGlua09wdGlvbnMgPSBuZXcgT2JqZWN0KCk7XHJcbiAgICAgIHRoaXMubGlua09wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xyXG4gICAgICAgIGxpbmtPcHRpb25zW29wdGlvbl0gPSB0aGlzW29wdGlvbl07XHJcbiAgICAgIH0pXHJcbiAgICAgIGxldCBuZXdTZXJpYWxpemVkVmFsdWUgPSBidG9hKEpTT04uc3RyaW5naWZ5KGxpbmtPcHRpb25zLCAoa2V5LCB2YWx1ZSkgPT4gdmFsdWUgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IHNlcmlhbGl6ZUZ1bmN0aW9uKHZhbHVlKSA6IHZhbHVlKSk7XHJcbiAgICAgIGxldCBuZXdVcmxTZWFyY2hQYXJhbSA9IHJlcGxhY2VVcmxTZWFyY2hQYXJhbWV0ZXIoYHRhYmxlJHt0aGlzLnRhYmxlSWR9YCwgbmV3U2VyaWFsaXplZFZhbHVlKTtcclxuICAgICAgaWYodGhpcy5kcmF3T3B0aW9uYWxzLnJld3JpdGV1cmwpIGhpc3RvcnkucmVwbGFjZVN0YXRlKGhpc3Rvcnkuc3RhdGUsICcnLCBuZXdVcmxTZWFyY2hQYXJhbSlcclxuICAgIH1cclxuXHJcbiAgICBsb2FkTGlua09wdGlvbnMoKXtcclxuICAgICAgbGV0IHNlcmlhbGl6ZWRPcHRpb25zID0gJ3t9JztcclxuICAgICAgbG9jYXRpb24uc2VhcmNoLnNsaWNlKDEpLnNwbGl0KCcmJykuZm9yRWFjaChzZWFyY2hPcHRpb24gPT4ge1xyXG4gICAgICAgIGxldCBzcGxpdCA9IHNlYXJjaE9wdGlvbi5zcGxpdCgnPScpXHJcbiAgICAgICAgaWYoc3BsaXRbMF0gPT0gYHRhYmxlJHt0aGlzLnRhYmxlSWR9YCl7XHJcbiAgICAgICAgICBzZXJpYWxpemVkT3B0aW9ucyA9IGF0b2Ioc3BsaXQuc2xpY2UoMSkuam9pbignPScpKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICAgIGxldCBwYXJ0aWFsT3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VyaWFsaXplZE9wdGlvbnMsIChrZXksIHZhbHVlKSA9PiB7XHJcbiAgICAgICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBBcnJheSkgICYmIHZhbHVlLnRvU3RyaW5nKCkubWF0Y2goZnVuUmVnZXgpKSB7XHJcbiAgICAgICAgICByZXR1cm4gZGVzZXJpYWxpemVGdW5jdGlvbih2YWx1ZSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIHZhbHVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIHBhcnRpYWxPcHRpb25zO1xyXG4gICAgICAvLyB0aGlzLnJlZHJhd0RhdGEoKTpcclxuICAgIH1cclxuXHJcbiAgICBkZXNlcmlhbGl6ZU9wdGlvbnMoc2VyaWFsaXplZE9wdGlvbnMpe1xyXG4gICAgICBpZihzZXJpYWxpemVkT3B0aW9ucyl7XHJcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoYXRvYihzZXJpYWxpemVkT3B0aW9ucywgKGtleSwgdmFsdWUpID0+IHtcclxuICAgICAgICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpICAmJiB2YWx1ZS50b1N0cmluZygpLm1hdGNoKGZ1blJlZ2V4KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZGVzZXJpYWxpemVGdW5jdGlvbih2YWx1ZSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSkpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiB7fTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRTZXJpYWxpemVkT3B0aW9ucyhzZXJpYWxpemVkT3B0aW9ucyl7XHJcbiAgICAgIHRoaXMub3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VyaWFsaXplZE9wdGlvbnMsIChrZXksIHZhbHVlKSA9PiB7XHJcbiAgICAgICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBBcnJheSkgICYmIHZhbHVlLnRvU3RyaW5nKCkubWF0Y2goZnVuUmVnZXgpKSB7XHJcbiAgICAgICAgICByZXR1cm4gZGVzZXJpYWxpemVGdW5jdGlvbih2YWx1ZSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIHZhbHVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgICAgLy8gdGhpcy5zb3J0ZWREYXRhID0gYXBwbHlTb3J0aW5nKHRoaXMpO1xyXG4gICAgICB0aGlzLnRpY2tlZFJvd3MgPSB0aGlzLm9wdGlvbnMudGlja2VkUm93cztcclxuICAgICAgdGhpcy5yZWRyYXdEYXRhKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsZWQgd2hlbiB0YWJsZSBpcyBhZGRlZCB0byBET00uIERvZXNuJ3QgbmVlZCB0byBiZSBjYWxsZWQgbWFudWFsbHkuXHJcbiAgICAgKi9cclxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCl7XHJcbiAgICAgIGlmKCF0aGlzLnJvb3RfZG9jdW1lbnQuYm9keSkgdGhpcy5yb290X2RvY3VtZW50LmJvZHkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdib2R5Jyk7XHJcbiAgICAgIGlmKCF0aGlzLnJvb3RfZG9jdW1lbnQuaGVhZCkgdGhpcy5yb290X2RvY3VtZW50LmhlYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoZWFkJyk7XHJcblxyXG4gICAgICAvLyB0aGlzLnRhYmxlSWQgPSB0aGlzLnJvb3RfZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLndndC1ncmlkLWNvbnRhaW5lcicpLmxlbmd0aDsgLy8vLyBUT0RPOiBjaGVjayBpZiBtdWx0aXBsZSB0YWJsZXMgaGF2ZSBjb25zaXN0YW50bHkgZGlmZmVyZW50IGlkcy5cclxuICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKGB0YWJsZS1pZC0ke3RoaXMudGFibGVJZH1gKTsgICAgICBcclxuICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCd3Z3QtZ3JpZC1jb250YWluZXInKVxyXG4gICAgICBpZighdGhpcy5zb3J0ZWREYXRhICYmIHRoaXMuZGF0YSkgdGhpcy5zb3J0ZWREYXRhID0gdGhpcy5kYXRhLm1hcCh2YWx1ZSA9PiB2YWx1ZSk7XHJcbiAgICAgIGxldCBoZWlnaHQgPSB0aGlzLmdldEF0dHJpYnV0ZSgnaGVpZ2h0Jyk7XHJcbiAgICAgIGlmKGhlaWdodCkgdGhpcy5zdHlsZS5tYXhIZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICAgIGxldCBwYWdlU2l6ZSA9IHRoaXMuZ2V0QXR0cmlidXRlKCdwYWdlLXNpemUnKTtcclxuICAgICAgaWYocGFnZVNpemUpIHtcclxuICAgICAgICB0aGlzLnBhZ2luYXRpb24ucGFnZVNpemUgPSBwYWdlU2l6ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5sb2FkSW5pdGlhbE9wdGlvbnMoKTtcclxuICAgICAgZHJhd1RhYmxlKHRoaXMpO1xyXG4gICAgfVxyXG4gXHJcbiAgICBsb2FkSW5pdGlhbE9wdGlvbnMoKXtcclxuICAgICAgbGV0IGF0dHJpYnV0ZU9wdGlvbnMgPSB0aGlzLmRlc2VyaWFsaXplT3B0aW9ucyh0aGlzLmdldEF0dHJpYnV0ZSgnb3B0aW9ucycpKTtcclxuICAgICAgbGV0IGxpbmtPcHRpb25zID0gdGhpcy5sb2FkTGlua09wdGlvbnMoKTtcclxuXHJcbiAgICAgICgobmV3IFNldChPYmplY3Qua2V5cyhhdHRyaWJ1dGVPcHRpb25zKSkpLnVuaW9uKE9iamVjdC5rZXlzKGxpbmtPcHRpb25zKSkpLmZvckVhY2gob3B0aW9uID0+IHtcclxuICAgICAgICBpZihhdHRyaWJ1dGVPcHRpb25zW29wdGlvbl0pe1xyXG4gICAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbl0gPSBhdHRyaWJ1dGVPcHRpb25zW29wdGlvbl07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGxpbmtPcHRpb25zW29wdGlvbl0gJiYgT2JqZWN0LmtleXMobGlua09wdGlvbnNbb3B0aW9uXSkubGVuZ3RoICE9IDApe1xyXG4gICAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbl0gPSBsaW5rT3B0aW9uc1tvcHRpb25dO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMub3B0aW9ucylcclxuXHJcbiAgICAgIHRoaXMubG9hZFBhcnRpYWxPcHRpb25zKHRoaXMub3B0aW9ucyk7XHJcbiAgICB9IFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29uZmlndXJlIGEgZGVib3VuY2UgZnVuY3Rpb24gZm9yIGV2ZW50IGJhc2VkIHRhYmxlIGNoYW5nZXMgbGlrZSBzb3J0Q2xpY2sgYW5kIGZpbHRlckNoYW5nZS5cclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZGVib3VuY2VGbiBhIGRlYm91bmNlIGZ1bmN0aW9uOyBoYXMgdG8gcmV0dXJuIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb247IHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gc2hvdWxkIGltcGxlbWVudCBhIGNhbmNlbCBmdW5jdGlvbi4gKHRlc3RlZCB3aXRoIGxvZGFzaC5kZWJvdW5jZSlcclxuICAgICAqIEBwYXJhbSB7QXJyYXk8YW55Pn0gc29ydERlYm91bmNlT3B0aW9ucyB0aGUgYXJndW1lbnRzIGxpc3QgZm9yIHRoZSBzb3J0IGNsaWNrIGV2ZW50IHJlcXVpcmVkIGJ5IHRoZSBkZWJvdW5jZSBmdW5jdGlvbi5cclxuICAgICAqIEBwYXJhbSB7QXJyYXk8YW55Pn0gZmlsdGVyRGVib3VuY2VkT3B0aW9ucyB0aGUgYXJndW1lbnRzIGxpc3QgZm9yIHRoZSBmaWx0ZXIgY2hhbmdlIGV2ZW50IHJlcXVpcmVkIGJ5IHRoZSBkZWJvdW5jZSAgYnkgdGhlIGRlYm91bmNlIGZ1bmN0aW9uLlxyXG4gICAgICovXHJcbiAgICBzZXREZWJvdW5jZUZuKGRlYm91bmNlRm4sIHNvcnREZWJvdW5jZU9wdGlvbnMsIGZpbHRlckRlYm91bmNlZE9wdGlvbnMpe1xyXG4gICAgICBpZih0aGlzLm9wdGlvbmFsRGVib3VuY2VGbikge1xyXG4gICAgICAgIG9uU29ydENsaWNrLmNhbmNlbCgpXHJcbiAgICAgICAgZmlsdGVyQ2hhbmdlZC5jYW5jZWwoKVxyXG4gICAgICB9XHJcbiAgICAgIHRoaXMub3B0aW9uYWxEZWJvdW5jZUZuID0gZGVib3VuY2VGbjtcclxuICAgICAgb25Tb3J0Q2xpY2sgPSB0aGlzLm9wdGlvbmFsRGVib3VuY2VGbihvblNvcnRDbGljaywgLi4uc29ydERlYm91bmNlT3B0aW9ucyk7XHJcbiAgICAgIGZpbHRlckNoYW5nZWQgPSB0aGlzLm9wdGlvbmFsRGVib3VuY2VGbihmaWx0ZXJDaGFuZ2VkLCAuLi5maWx0ZXJEZWJvdW5jZWRPcHRpb25zKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTZXQgdGhlIGRhdGEgdG8gYmUgZGlzcGxheWVkIGJ5IHRhYmxlIGFzIGEgbGlzdCBvZiByb3cgb2JqZWN0cy5cclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtBcnJheTxPYmplY3Q+fSBkYXRhIFxyXG4gICAgICovXHJcbiAgICBfc2V0RGF0YShkYXRhKXtcclxuICAgICAgLy8gbGV0IGRhdGFXaXRoSW5jbHVkZSA9IGRhdGEubWFwKGVudHJ5ID0+IHtcclxuICAgICAgLy8gICBsZXQgdGVtcFJvdyA9IGVudHJ5O1xyXG4gICAgICAvLyAgIC8vIGRlbGV0ZSB0ZW1wUm93WycjaW5jbHVkZSddO1xyXG4gICAgICAvLyAgIC8vIHRlbXBSb3dbJyNpbmNsdWRlJ10gPSAneCc7XHJcbiAgICAgIC8vICAgbGV0IHJlc3VsdCA9IHsnI2luY2x1ZGUnOiAneCd9O1xyXG4gICAgICAvLyAgIE9iamVjdC5rZXlzKHRlbXBSb3cpLmZvckVhY2goa2V5ID0+IHtcclxuICAgICAgLy8gICAgIHJlc3VsdFtrZXldID0gdGVtcFJvd1trZXldOyBcclxuICAgICAgLy8gICB9KVxyXG4gICAgICAvLyAgIC8vIGxldCByZXN1bHQgPSB7JyNpbmNsdWRlJzogJ3gnLCAuLi50ZW1wUm93fTtcclxuICAgICAgLy8gICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAvLyB9KTtcclxuICAgICAgLy8gbGV0IGRhdGFXaXRoSW5jbHVkZSA9IGRhdGE7XHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKCd3aXRoIEluY2x1ZGUnLCBkYXRhV2l0aEluY2x1ZGUpO1xyXG4gICAgICB0aGlzLmRhdGEgPSBkYXRhO1xyXG4gICAgICAvLyBjb25zb2xlLmxvZyh0cmFuc2Zvcm1Ub0dyb3VwZWREYXRhKGRhdGEsIFtcIkJlbElEXCIsIFwiQmVsZWdkYXR1bVwiLCBcIkxpZWZlcmFudFwiLCBcIk5ldHRvYmV0cmFnXCJdKSlcclxuICAgICAgdGhpcy5zb3J0ZWREYXRhID0gdGhpcy5kYXRhLm1hcCh2YWx1ZSA9PiB2YWx1ZSk7XHJcbiAgICAgIGRyYXdUYWJsZSh0aGlzKTtcclxuICAgICAgdGhpcy5sb2FkSW5pdGlhbE9wdGlvbnMoKTtcclxuICAgIH1cclxuXHJcbiAgICBzZXREYXRhIChkYXRhKXtcclxuICAgICAgdGhpcy5fc2V0RGF0YShkYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldCB0aGUgZGF0YSB0aGF0IGlzIHNvcnRlZCwgZm9ybWF0dGVkIGFuZCBmaWx0ZXJlZC5cclxuICAgICAqL1xyXG4gICAgZ2V0RGlzcGxheWVkRGF0YSgpe1xyXG4gICAgICByZXR1cm4gdGhpcy5kaXNwbGF5ZWREYXRhO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IHRoZSBvcmlnaW5hbCBEYXRhIHRoYXQgd2FzIHN1cHBsaWVkIHRvIHRoZSB0YWJsZS5cclxuICAgICAqL1xyXG4gICAgZ2V0T3JpZ2luYWxEYXRhKCl7XHJcbiAgICAgIHJldHVybiB0aGlzLmRhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGb3JjZSBhIHJlZnJlc2gsIGluIGNhc2UgdGhlIGRhdGEgaGFzIGNoYW5nZWQuIEFsdGVybmF0aXZlbHkgeW91IGNhbiBjYWxsIFRhYmxlQ29tcG9uZW50LnNldERhdGEobmV3RGF0YSkuXHJcbiAgICAgKi9cclxuICAgIHJlZHJhd0RhdGEoKXtcclxuICAgICAgdGhpcy5oZWFkZXIuZm9yRWFjaChjb2x1bW4gPT4ge1xyXG4gICAgICAgIGlmICh0aGlzLmVsZW1lbnRzLmRhdGFDZWxsc1tjb2x1bW5dKSBbXS5mb3JFYWNoLmNhbGwodGhpcy5lbGVtZW50cy5kYXRhQ2VsbHNbY29sdW1uXSwgZWxlbWVudCA9PiBlbGVtZW50LnJlbW92ZSgpKTtcclxuICAgICAgICBpZiAodGhpcy5kcmF3T3B0aW9uYWxzLmZpbHRlciAmJiB0aGlzLmVsZW1lbnRzLmZpbHRlckNlbGxzW2NvbHVtbl0uZmlyc3RDaGlsZC50ZXh0Q29udGVudCAhPSB0aGlzLmZpbHRlcltjb2x1bW5dKSB0aGlzLmVsZW1lbnRzLmZpbHRlckNlbGxzW2NvbHVtbl0uZmlyc3RDaGlsZC50ZXh0Q29udGVudCA9IHRoaXMuZmlsdGVyW2NvbHVtbl07XHJcbiAgICAgICAgLy8gdGhpcy5lbGVtZW50cy5maWx0ZXJDZWxsc1tjb2x1bW5dLmZpcnN0Q2hpbGQudGV4dENvbnRlbnQgPSB0aGlzLmZpbHRlcltjb2x1bW5dID8gdGhpcy5maWx0ZXJbY29sdW1uXSA6ICcnO1xyXG5cclxuICAgICAgfSk7IFxyXG4gICAgICBpZiAodGhpcy5kYXRhLmxlbmd0aCA+IDApe1xyXG4gICAgICAgIGxldCB3YXNTZWxlY3RlZCA9IHRoaXMuZWxlbWVudHMucGFnZUNob29zZXIgPyB0aGlzLmVsZW1lbnRzLnBhZ2VDaG9vc2VyLmNsYXNzTGlzdC5jb250YWlucygnc2VsZWN0ZWQnKSA6IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheWVkRGF0YSA9IGRyYXdEYXRhKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuZWxlbWVudHMucGFnZUNob29zZXIgPSBjcmVhdGVQYWdlQ2hvb3Nlcih0aGlzLCB0aGlzLmRpc3BsYXllZERhdGEpO1xyXG4gICAgICAgIGlmICh0aGlzLmRyYXdPcHRpb25hbHMuZm9vdGVyKSBjcmVhdGVGb290ZXIodGhpcywgdGhpcy5kaXNwbGF5ZWREYXRhLCB0aGlzLmVsZW1lbnRzLnBhZ2VDaG9vc2VyKTtcclxuICAgICAgICBpZiAod2FzU2VsZWN0ZWQpIHRoaXMuZWxlbWVudHMucGFnZUNob29zZXIuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJlZHJhd1RhYmxlKCl7XHJcbiAgICAgIC8vdGhpcy5zb3J0ZWREYXRhID0gdGhpcy5kYXRhLm1hcCh2YWx1ZSA9PiB2YWx1ZSk7XHJcbiAgICAgIGxldCBwYXJ0aWFsT3B0aW9ucyA9IHt9O1xyXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLm9wdGlvbnMpLmZvckVhY2gob3B0aW9uID0+IHtcclxuICAgICAgICBpZih0aGlzLmxpbmtPcHRpb25zLmluY2x1ZGVzKG9wdGlvbikpe1xyXG4gICAgICAgICAgcGFydGlhbE9wdGlvbnNbb3B0aW9uXSA9IHRoaXNbb3B0aW9uXTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgICBkcmF3VGFibGUodGhpcyk7XHJcbiAgICAgIHJlYXBwbHlTb3J0aW5nKHRoaXMsIHBhcnRpYWxPcHRpb25zKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJlZ2lzdGVyIGEgcGx1Z2luLCB3aGljaCBpcyBjYWxsZWQgc29tZXdoZXJlIGluIHRoZSBsaWZlY3ljbGUgb2YgVGFibGVDb21wb25lbnQgKGRlcGVuZGluZyBvbiBwbHVnaW5UeXBlKS5cclxuICAgICAqIEBwYXJhbSB7VGFibGVQbHVnaW59IHBsdWdpblxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBsdWdpblR5cGUgLSBzcGVjaWZpZXMgYXQgd2hpY2ggcG9pbnQgdGhlIHBsdWdpbnMgZXhlYyBtZXRob2QgaXMgY2FsbGVkLiBPbmUgb2YgYFtkYXRhXWBcclxuICAgICAqIEB0aHJvd3Mge0Vycm9yfSB3aGVuIHBsdWdpblR5cGUgaXNuJ3Qga25vd24gXHJcbiAgICAgKi9cclxuICAgIHJlZ2lzdGVyUGx1Z2luKHBsdWdpbil7XHJcbiAgICAgIGNvbnNvbGUubG9nKHBsdWdpbik7XHJcbiAgICAgIGlmICghdGhpcy5wbHVnaW5zW3BsdWdpbi50eXBlXSkgdGhpcy5wbHVnaW5zW3BsdWdpbi50eXBlXSA9IHt9O1xyXG4gICAgICB0aGlzLnBsdWdpbnNbcGx1Z2luLnR5cGVdW3BsdWdpbi5uYW1lXSA9IHBsdWdpbjtcclxuICAgICAgbGV0IGV4dGVuc2lvbk1ldGhvZHMgPSBSZWZsZWN0Lm93bktleXMocGx1Z2luLnRhYmxlRXh0ZW5zaW9ucyk7XHJcbiAgICAgIGV4dGVuc2lvbk1ldGhvZHMuZm9yRWFjaChtZXRob2QgPT4ge1xyXG4gICAgICAgIGlmKCFUYWJsZUNvbXBvbmVudC5wcm90b3R5cGVbbWV0aG9kXSkgVGFibGVDb21wb25lbnQucHJvdG90eXBlW21ldGhvZF0gPSBwbHVnaW4udGFibGVFeHRlbnNpb25zW21ldGhvZF0uYmluZCh0aGlzKTtcclxuICAgICAgfSk7XHJcbiAgICAgIHN3aXRjaChwbHVnaW4udHlwZSl7XHJcbiAgICAgICAgY2FzZSBcImRhdGFcIjpcclxuICAgICAgICAgIGxldCBzZXREYXRhRm4gPSB0aGlzLnNldERhdGEuYmluZCh0aGlzKTtcclxuICAgICAgICAgIHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coe2ltcG9ydGFudDogdGhpc30pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcGx1Z2luLmV4ZWMuYmluZCh0aGlzKShkYXRhKS50aGVuKCAobW9kaWZpZWREYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgLy8gdGhpcy5fc2V0RGF0YShtb2RpZmllZERhdGEpO1xyXG4gICAgICAgICAgICAgIHNldERhdGFGbihtb2RpZmllZERhdGEpO1xyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwidWlcIjpcclxuICAgICAgICAgIC8vIHBsdWdpbi5leGVjKHRoaXMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlwiKVxyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtyZWdleEZpbHRlciwgdGV4dEZpbHRlciwgY29tcGFyZU51bWJlcnMsIGNvbXBhcmVUZXh0LCBjaG9vc2VTb3J0c0NvbXBhcmVGbiwgZGVmaW5lQ3VzdG9tRWxlbWVudCwgVGFibGVDb21wb25lbnR9O1xyXG59KSgpIiwidmFyIGNzcyA9IFwiZGl2LndndC1oZWFkZXIgZGl2IHtcXG4gIHdvcmQtd3JhcDogbm9ybWFsO1xcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcXG59XFxucHJvdC10YWJsZS12MyB1bCB7XFxuICBwYWRkaW5nLXRvcDogNXB4O1xcbiAgcGFkZGluZy1sZWZ0OiAxMHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XFxufVxcblwiOyAocmVxdWlyZShcImJyb3dzZXJpZnktY3NzXCIpLmNyZWF0ZVN0eWxlKGNzcywgeyBcImhyZWZcIjogXCJzdHlsZS5jc3NcIiB9LCB7IFwiaW5zZXJ0QXRcIjogXCJib3R0b21cIiB9KSk7IG1vZHVsZS5leHBvcnRzID0gY3NzOyJdfQ==
