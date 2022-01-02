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
             * TODO: table creation is not implemented yet.
             */
            DatabaseTable: this.getAttribute('databasetable') ? this.getAttribute('databasetable') : "DefaultTable",

            /**
             * When the html attribute "checked" is set, the checkbox is marked. Optional (default: false)!
             */
            IsChecked: this.hasAttribute('checked'),

            /**
             * The text, which is added to the checkbox, so that it can be filtered with table. MarkerText needs to be a string with "|" as separetor character. Left value is for checked, right for unchecked. Optional (default: "-1|0") 
             */
            MarkerText: this.getAttribute('markertext') ? this.getAttribute('markertext') : "-1|0",
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
        this.dataElements.FilterTextSpan.style.visibility = 'hidden';
        this.dataElements.FilterTextSpan.textContent = this.dataAttributes.IsChecked ? markedText : unmarkedText;
        this.append(this.dataElements.FilterTextSpan);
    }

    /**
     * Change all necassarry values, when the status of IsChecked changes to true.
     * @param {boolean} updateTable - true means the rest of the table is getting an setChecked(false) call.
     */
    setChecked(updateTable) {
        this.dataAttributes.IsChecked = true;
        this.toggleAttribute('checked', true);
        this.dataElements.CheckboxInput.toggleAttribute('checked', true);
        this.dataElements.CheckboxInput.checked = true;
        this.dataElements.FilterTextSpan.textContent = this.dataAttributes.MarkerText.split('|')[0];
        // if (updateTable) this.dataProperties.ParentTable.data.filter((entry) => (console.log(entry['marker']), entry[this.dataAttributes.IdentifierField] == this.dataAttributes.IdentifierValue)).map(entry => (entry['marker'].setChecked(false)));
        if (updateTable) document.querySelectorAll(`.table-id-${this.dataProperties.ParentTable.tableId} mark-input.marker_${this.dataAttributes.IdentifierValue}`).forEach(
            (marker) => (marker.setChecked(false))
        );
    }

    /**
     * Change all necassarry values, when the status of IsChecked changes to false.
     * @param {boolean} updateTable - true means the rest of the table is getting an setChecked(false) call.
     */
    unsetChecked(updateTable) {
        this.dataAttributes.IsChecked = false;
        this.toggleAttribute('checked', false);
        this.dataElements.CheckboxInput.removeAttribute('checked');
        this.dataElements.CheckboxInput.checked = false;
        this.dataElements.FilterTextSpan.textContent = this.dataAttributes.MarkerText.split('|')[1];
        // if (updateTable) this.dataProperties.ParentTable.data.filter((entry) => (entry[this.dataAttributes.IdentifierField] == this.dataAttributes.IdentifierValue)).map(entry => (entry[this.dataAttributes.IdentifierField].unsetChecked(false)));
        if (updateTable) document.querySelectorAll(`.table-id-${this.dataProperties.ParentTable.tableId} mark-input.marker_${this.dataAttributes.IdentifierValue}`).forEach(
            (marker) => (marker.unsetChecked(false))
        );
    }

    /**
     * Create the table in SQLServer, if it doesn't already exist.
     * TODO: Needs to be called once for all "MarkInput" elements inside of a table. 
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
            // console.log(data);
            return data;
        });
}

// customElements.define('mark-input', MarkInput);

module.exports = {
    MarkInput,
    fetchSelectCheckedValues
};
},{}],2:[function(require,module,exports){
let wcGridTable = require("wc-grid-table/src/wc-grid-table.js");
let { MarkInput, fetchSelectCheckedValues } = require("./MarkInput");

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
        fetch('https://10.19.28.94:8084/query?database=formly', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: `{"query": "SELECT [synonym], [link], [tooltip] FROM schemaAuskunftLinks;"}`
            })
            .then(response => response.json())
            .then(response => {
                let links = response.map(entry => {
                    let newEntry = {}
                    newEntry[entry.synonym] = entry.link;
                    return newEntry;
                });
                Object.keys(links).forEach(key => {
                    let tmp = links[key];
                    links[key] = [(value) => `<a href="${tmp}${value}">${value}</a>`]
                })
                this.formatter = links;
                this.setupProtTableData();
            })
            .catch(err => {
                console.error(err);
                console.log("caught.");
                this.setupProtTableData();
            });

    }

    setupProtTableData() {

        let jsonUrl = this.getAttribute('data_url');
        if (jsonUrl) {
            fetch(jsonUrl)
                .then(data => data.json())
                .then(data => {
                    this.setupMarkInputs(data)
                        .then(markData => this.setData(markData));
                });
        }
    }

    /**
     * Sets up the marker column, but only when all of the required attributes exist.
     * @param {object} data - table data
     * @returns {object} - table data
     */
    async setupMarkInputs(data) {
        const requiredAttributes = {
            identifierField: this.getAttribute('marker_identifierfield'),
            databaseTable: this.getAttribute('marker_databasetable'),
        };

        const optionalAttributes = {
            database: this.getAttribute('marker_database'),
            databaseuser: this.getAttribute('marker_databaseuser'),
            markerText: this.getAttribute('marker_markertext'),
        };

        if (Reflect.ownKeys(requiredAttributes).map((key) => requiredAttributes[key]).every((value) => (value === undefined ? false : true))) {
            // console.log(data);
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

        database = database ? database : "MarkerDB";
        databaseuser = databaseuser ? databaseuser : "wiki";
        // databaseTable = databaseTable ? databaseTable : "DefaultTable";
        markerText = markerText ? markerText : "jjj|nnn";

        return fetchSelectCheckedValues(database, databaseuser, databaseTable, identifierField)
            .then((checkedData) => {
                return data.map((entry) => {
                    let checked = checkedData.map((value) => value.identifierValue).includes(entry[identifierField].toString());
                    return {
                        'marker': this.createMarkInput(identifierField, entry[identifierField].toString(), databaseTable, database, databaseuser, markerText, checked),
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
},{"./MarkInput":1,"./style.css":11,"wc-grid-table/src/wc-grid-table.js":10}],3:[function(require,module,exports){
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
var murmur3 = require("./murmurhash3_gc.js")
var murmur2 = require("./murmurhash2_gc.js")

module.exports = murmur3
module.exports.murmur3 = murmur3
module.exports.murmur2 = murmur2

},{"./murmurhash2_gc.js":5,"./murmurhash3_gc.js":6}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
var css = "/* body {\r\n  font: arial, sans-serif;\r\n} */\n.wgt-grid-container {\n  display: grid;\n  position: static;\n  max-width: min-content;\n  max-height: 500px;\n  overflow-y: scroll;\n  background: lightgray;\n  /* grid-gap: 1px; */\n  /* grid-row-gap: 2px; */\n  grid-column-gap: 2px;\n  border: 1px solid lightgray;\n}\n.header-col-tooltip {\n  position: absolute;\n  font-weight: bold;\n  border: 1px solid lightgray;\n  border-right: 1px dotted lightgray;\n  pointer-events: none;\n  z-index: 99;\n  visibility: hidden;\n  margin: -1px;\n}\n.header-col-tooltip.visible {\n  visibility: visible;\n}\n.wgt-header {\n  font-weight: bold;\n  position: sticky;\n  box-sizing: border-box;\n  top: 0px;\n  border-bottom: 1px solid lightgray;\n  overflow-y: hidden;\n}\n.wgt-header>div.arrow {\n  /* visibility: hidden; */\n  color: lightgray;\n  width: 1em;\n  position: absolute;\n  font-weight: bold;\n  top: 0px;\n  bottom: 0px;\n  right: 0px;\n  padding-right: 5px;\n  margin-top: auto;\n  margin-bottom: auto;\n  font-family: monospace;\n  font-size: large;\n  vertical-align: middle;\n  padding-top: 5px;\n  padding-bottom: 5px;\n  cursor: pointer;\n  -moz-user-select: text;\n  background: white;\n  text-align: center;\n  transform: scale(1, 2)translate(20%, 13%);\n}\n.wgt-col-header-container {\n  width: 1em;\n  overflow-x: visible;\n}\n.wgt-filter_cell {\n  position: sticky;\n  top: 0px;\n  background: white;\n  box-sizing: border-box;\n  width: 100%;\n  height: 2em;\n  text-align: center;\n  vertical-align: middle;\n  font-size: 1rem;\n  border-bottom: 1px solid lightgray;\n  box-shadow: inset 1px 1px 5px 0px lightgrey;\n  padding-top: 5px;\n  padding-bottom: 5px;\n  margin-top: auto;\n  margin-bottom: auto;\n}\n.filter_input {\n  position: absolute;\n  top: 0px;\n  left: 0px;\n  bottom: 0px;\n  right: 0px;\n  margin-top: auto;\n  margin-bottom: auto;\n  padding-top: 5px;\n  padding-bottom: 5px;\n}\n.filter_negator {\n  position: absolute;\n  font-weight: bold;\n  top: 0px;\n  bottom: 0px;\n  left: 0px;\n  padding-left: 5px;\n  margin-top: auto;\n  margin-bottom: auto;\n  font-family: monospace;\n  font-size: 1em;\n  vertical-align: middle;\n  padding-top: 5px;\n  padding-bottom: 5px;\n  cursor: pointer;\n}\n.wgt-cell {\n  box-sizing: border-box;\n  font-size: 1rem;\n  padding-left: 20px;\n  padding-right: 20px;\n  padding-top: 10px;\n  padding-bottom: 10px;\n  background: white;\n  /* border: 2px solid lightgray; */\n  overflow-x: hidden;\n}\n.wgt-data-cell {\n  max-width: 500px;\n}\n.wgt-header.wgt-cell {\n  padding-right: 30px;\n}\n.wgt-zebra_1 {\n  background: white;\n}\n.wgt-zebra_0 {\n  background: rgb(230, 230, 230);\n}\n.wgt-footer {\n  display: grid;\n  position: sticky;\n  bottom: 0px;\n  background: white;\n  border-top: 1px solid lightgray;\n  grid-template-rows: 1fr;\n  grid-template-columns: repeat(4, fit-content(300px)) 1fr;\n}\n.footer-button {\n  position: relative;\n  border: 1px solid rgba(27, 31, 35, .2);\n  /* border-radius: .25em; */\n  width: max-content;\n  overflow: visible;\n  cursor: pointer;\n  background-color: #eff3f6;\n  background-image: linear-gradient(-180deg, #fafbfc, eff3f6, 90%);\n  background-repeat: repeat-x;\n  background-position: -1px -1px;\n  background-size: 110% 110%;\n  -webkit-appearance: none;\n  -moz-appearance: none;\n  appearance: none;\n  user-select: none;\n}\n.footer-button:hover {\n  box-shadow: inset 0px 0px 20px 2px rgba(0, 0, 0, 0.2);\n}\n.footer-button-down:after {\n  display: inline-block;\n  width: 0px;\n  height: 0px;\n  vertical-align: -2px;\n  content: \"\";\n  border: 4px solid transparent;\n  border-top-color: currentcolor;\n}\n.column-chooser-menu-container {\n  /* position: absolute; */\n  position: relative;\n  width: 200px;\n  height: min-content;\n  /* top: 0px; */\n  /* bottom: 0px; */\n  left: 0px;\n  /* right: 0px; */\n  /* background-color: rgba(0,0,0,.5); */\n  z-index: 99;\n  visibility: visible;\n}\n.column-chooser-menu {\n  margin-top: auto;\n  margin-bottom: auto;\n  overflow: hidden;\n  color: black;\n  border: 1px solid rgba(100, 100, 100, 0.5);\n  border-radius: 5px;\n  list-style: none;\n  padding-left: 0px;\n  background-color: lightgray;\n  box-shadow: 1px 2px 10px 2px rgba(0, 0, 0, 0.2);\n}\n.column-chooser-menu-container.hidden {\n  visibility: hidden;\n  height: 0px;\n}\n.column-chooser-item {\n  background-color: white;\n  /* border-radius: 5px; */\n  margin-top: 1px;\n  user-select: none;\n  white-space: nowrap;\n}\n.column-chooser-item:first-child {\n  margin-top: 0px;\n}\n.column-chooser-item:hover {\n  background-color: lightblue;\n  box-sizing: border-box;\n  background-clip: padding-box;\n  border-radius: 5px;\n}\n.column-chooser-item>label {\n  display: block;\n  cursor: pointer;\n  padding: 5px 20px 5px 5px;\n}\n.page-chooser {\n  display: grid;\n  grid-template-rows: auto;\n  grid-template-columns: repeat(9, auto);\n  font-family: monospace;\n  grid-column: -1;\n  border-left: none;\n  position: sticky;\n  right: 0px;\n}\n.page-chooser.selected {\n  border-left: 1px dotted gray;\n}\n.page-change {\n  margin-top: auto;\n  margin-bottom: auto;\n  padding-left: 5px;\n  padding-right: 5px;\n}\n.page-change:first-child {\n  margin-top: auto !important;\n}\n.page-change:not(.page-change-disabled) {\n  cursor: pointer;\n}\n.page-change-disabled {\n  color: gray;\n}\n.active-page {\n  font-weight: bold;\n}\n.wgt-footer_cell {\n  border-right: 1px solid lightgray;\n  width: max-content;\n}\n@-moz-document url-prefix()  {\n  .wgt-grid-container div:nth-last-child(2).wgt-data-cell {\n    height: 200%;\n  }\n\n  .filter_negator {\n    font-size: 1em;\n  }\n}\n"; (require("browserify-css").createStyle(css, { "href": "node_modules/wc-grid-table/src/wc-grid-table.css" }, { "insertAt": "bottom" })); module.exports = css;
},{"browserify-css":3}],10:[function(require,module,exports){
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
                if (data.every(row => (typeof(tryTransformToNumber(row[column])) == 'number' || row[column] == undefined))) {
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
            function toggleFilterNegator(table, column, event) {
                let newOperation = table.activeFilterOperations[column];
                if (newOperation === undefined || newOperation == '') newOperation = table.filterOperations[0].name;
                newOperation = table.filterOperations[(table.filterOperations.findIndex(element => (element.name == newOperation)) + 1) % table.filterOperations.length].name;
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
                        let dataObj = JSON.parse(event.data); // dataObj = {type: 'fix-columns', element: undefined, data: undefined}
                        if (dataObj.type === 'fix-columns') fixColumnHeader(table, col_height);
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

                    filter_negate.addEventListener('click', event => toggleFilterNegator.bind(null, table, column)(event))
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
        if(column === '#include') {
          cell.setAttribute('contentEditable', 'true');
          let tempRowActive = {...row};
          delete tempRowActive['#include'];
          // console.log(table.tickedRows);
          // console.log(JSON.stringify(tempRowActive));
          // console.log(table.tickedRows.includes(JSON.stringify(tempRowActive)));
          cell.innerText = table.tickedRows.includes(JSON.stringify(tempRowActive)) ? 'x' : '';
          cell.addEventListener('input', (event) => {       
            // console.log('input changed in row ' + rowIndex);     
            // console.log(event.target.innerText);
            let tempRow = {...row};
            delete tempRow['#include'];
            if(event.target.innerText){
              // console.log('added row');
              table.tickedRows.push( JSON.stringify(tempRow));
            } else {
              // console.log('removed row');
              table.tickedRows = table.tickedRows.filter(value => (value !== JSON.stringify(tempRow)));
            }
            table.serializeLinkOptions();
          });
        }
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
          if(column === '#include' && rowNr === 0){
            console.log('include 0', row, row[column], formatter[column]);
          }

          if(formatter[column]){
            formattedRow[column] = formatter[column].reduce((col, cur) => cur(col, rowNr, dataReadOnly), row[column])//.toString();
          } else {
            formattedRow[column] = row[column]
          }

          if(column === '#include' && rowNr === 0){
            console.log('include 0', formattedRow);
          }
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
    partialOptions['sortedBy'].reverse().slice(-4).forEach(sortStep => {
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
            reapplySorting(this, partialOptionsf);
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
      let dataWithInclude = data.map(entry => {
        let tempRow = entry;
        // delete tempRow['#include'];
        // tempRow['#include'] = 'x';
        let result = {'#include': 'x'};
        Object.keys(tempRow).forEach(key => {
          result[key] = tempRow[key]; 
        })
        // let result = {'#include': 'x', ...tempRow};
        return result;
      });
      console.log('with Include', dataWithInclude);
      this.data = dataWithInclude;
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
},{"./filter-utils.js":7,"./pagination-utils.js":8,"./wc-grid-table.css":9,"murmurhash-js":4}],11:[function(require,module,exports){
var css = "div.wgt-header div {\n  word-wrap: normal;\n  white-space: nowrap;\n}\nprot-table-v3 ul {\n  padding-top: 5px;\n  padding-left: 10px;\n  background-color: white;\n}\n"; (require("browserify-css").createStyle(css, { "href": "style.css" }, { "insertAt": "bottom" })); module.exports = css;
},{"browserify-css":3}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJNYXJrSW5wdXQuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5LWNzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL211cm11cmhhc2gtanMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbXVybXVyaGFzaC1qcy9tdXJtdXJoYXNoMl9nYy5qcyIsIm5vZGVfbW9kdWxlcy9tdXJtdXJoYXNoLWpzL211cm11cmhhc2gzX2djLmpzIiwibm9kZV9tb2R1bGVzL3djLWdyaWQtdGFibGUvc3JjL2ZpbHRlci11dGlscy5qcyIsIm5vZGVfbW9kdWxlcy93Yy1ncmlkLXRhYmxlL3NyYy9wYWdpbmF0aW9uLXV0aWxzLmpzIiwibm9kZV9tb2R1bGVzL3djLWdyaWQtdGFibGUvc3JjL3djLWdyaWQtdGFibGUuY3NzIiwibm9kZV9tb2R1bGVzL3djLWdyaWQtdGFibGUvc3JjL3djLWdyaWQtdGFibGUuanMiLCJzdHlsZS5jc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzdUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8gY29uc3QgeyBQcm90VGFibGUsIFRhYmxlQ29tcG9uZW50IH0gPSByZXF1aXJlKCcuL2luZGV4Jyk7XHJcblxyXG4vLyAvKipcclxuLy8gICogQHR5cGVkZWYge2ltcG9ydCgnLi9pbmRleCcpLlRhYmxlQ29tcG9uZW50fSBUYWJsZUNvbXBvbmVudFxyXG4vLyAgKiBAdHlwZWRlZiB7aW1wb3J0KCcuL2luZGV4JykuUHJvdFRhYmxlfSBQcm90VGFibGVcclxuLy8gICovXHJcblxyXG4vKipcclxuICogSGVhZGVyIGZvciBmZXRjaCByZXF1ZXN0cyB0byB0aGUgZGItaW50ZXJmYWNlLiBDb250ZW50LVR5cGUgbmVlZHMgdG8gYmUgXCJhcHBsaWNhdGlvbi9qc29uXCIuXHJcbiAqL1xyXG5jb25zdCBoZWFkZXIgPSB7XHJcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyB0aGUgYm9keSBmb3IgdGhlIGZldGNoIHJlcXVlc3QgdG8gdGhlIGRiLWludGVyZmFjZS5cclxuICogQHBhcmFtIHsoKSA9PiBzdHJpbmd9IHF1ZXJ5Rm4gLSBjYWxsYmFjaywgdGhhdCBnZW5lcmF0ZXMgdGhlIHF1ZXJ5LCBieSBzdWJzdGl0dXRpbmcgdGhlIHJlcXVpcmVkIGluZm9ybWF0aW9uIGludG8gYSBxdWVyeSB0ZW1wbGF0ZS5cclxuICogQHJldHVybnMge3N0cmluZ30gLSB0aGUgc3RyaW5naWZpZWQganNvbiBib2R5XHJcbiAqL1xyXG5jb25zdCBjcmVhdGVGZXRjaEJvZHkgPSAocXVlcnlGbikgPT4gSlNPTi5zdHJpbmdpZnkoeyBxdWVyeTogcXVlcnlGbigpIH0pO1xyXG5cclxuLy8gY29uc3QgaW5zZXJ0UXVlcnkgPSAoYXJ0aWtlbG51bW1lcikgPT4gYElOU0VSVCBJTlRPIEludmVudHVyQ3VycmVudFJlY291bnQgKEFydGlrZWxudW1tZXIpIFZBTFVFUyAoJyR7YXJ0aWtlbG51bW1lcn0nKTtgO1xyXG4vLyBjb25zdCBkZWxldGVRdWVyeSA9IChhcnRpa2VsbnVtbWVyKSA9PiBgREVMRVRFIEZST00gSW52ZW50dXJDdXJyZW50UmVjb3VudCBXSEVSRSBBcnRpa2VsbnVtbWVyID0gJyR7YXJ0aWtlbG51bW1lcn0nO2A7XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyB0aGUgZGF0YWJhc2UtaW50ZXJmYWNlIGxpbmsgZm9yIGEgZ2l2ZW4gZGF0YWJhc2VuYW1lIGFuZCB1c2VybmFtZS5cclxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGFiYXNlIC0gZGF0YWJhc2UgbmFtZSBcclxuICogQHBhcmFtIHtzdHJpbmd9IHVzZXJuYW1lIC0gZGF0YWJhc2UgdXNlcm5hbWUgXHJcbiAqIEByZXR1cm5zIFxyXG4gKi9cclxuY29uc3QgZGF0YWJhc2VVcmwgPSAoZGF0YWJhc2UsIHVzZXJuYW1lKSA9PiBgaHR0cHM6Ly9kYXRhYmFzZS5wcm90cm9uaWMtZ21iaC5kZS9xdWVyeT9kYXRhYmFzZT0ke2RhdGFiYXNlfSZ1c2VybmFtZT0ke3VzZXJuYW1lfWA7XHJcblxyXG4vKiogXHJcbiAqIEEgcXVlcnkgdG8gY3JlYXRlIHRoZSB0YWJsZSwgaWYgaXQgZG9lcyBub3QgZXhpc3QgeWV0LiBcclxuICogQHBhcmFtIHtzdHJpbmd9IGRhdGFiYXNlVGFibGUgLSBuYW1lIG9mIHRoZSB0YWJsZSBcclxuICogQHJldHVybnMge3N0cmluZ30gLSB0aGUgcXVlcnkgdG8gYmUgc2VuZCB0byB0aGUgZGJcclxuICovXHJcbmNvbnN0IGNyZWF0ZVRhYmxlUXVlcnkgPSAoZGF0YWJhc2VUYWJsZSkgPT4gYElGIE5PVCBFWElTVFMgKFNFTEVDVCAqIEZST00gc3lzLnRhYmxlcyBXSEVSRSBzeXMudGFibGVzLm5hbWUgPSAnJHtkYXRhYmFzZVRhYmxlfScpIENSRUFURSBUQUJMRSAke2RhdGFiYXNlVGFibGV9KGlkZW50aWZpZXJGaWVsZCBOVkFSQ0hBUihNQVgpLCBpZGVudGlmaWVyVmFsdWUgTlZBUkNIQVIoTUFYKSk7YDtcclxuXHJcbi8qKlxyXG4gKiBBIHF1ZXJ5IHRvIGdldCBhbGwgaWRlbnRpZmllclZhbHVlcyBmcm9tIGEgZ2l2ZW4gZGF0YWJhc2VUYWJsZS5cclxuICogQHBhcmFtIHsqfSBkYXRhYmFzZVRhYmxlIC0gbmFtZSBvZiB0aGUgdGFibGUgXHJcbiAqIEBwYXJhbSB7Kn0gaWRlbnRpZmllckZpZWxkIC0gdGhlIG5hbWUgb2YgdGhlIHByaW1hcnkta2V5LWZpZWxkXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IC0gdGhlIHF1ZXJ5IHRvIGJlIHNlbmQgdG8gdGhlIGRiXHJcbiAqL1xyXG5jb25zdCBzZWxlY3RDaGVja2VkRm9yQWxsID0gKGRhdGFiYXNlVGFibGUsIGlkZW50aWZpZXJGaWVsZCkgPT4gYFNFTEVDVCBbaWRlbnRpZmllclZhbHVlXSBGUk9NICR7ZGF0YWJhc2VUYWJsZX0gV0hFUkUgW2lkZW50aWZpZXJGaWVsZF0gPSAnJHtpZGVudGlmaWVyRmllbGR9JyBHUk9VUCBCWSBbaWRlbnRpZmllclZhbHVlXTtgO1xyXG5cclxuLyoqXHJcbiAqIEEgcXVlcnkgdG8gaW5zZXJ0IHZhbHVlcyBpbnRvIHRoZSBkYXRhYmFzZVRhYmxlLiBNYXJrZWQgVmFsdWVzIGFyZSBzYXZlZCB0byBkYiwgdW5tYXJrZWQgb25lcyBhcmUgbm90LlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YWJhc2VUYWJsZSAtIG5hbWUgb2YgdGhlIHRhYmxlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZGVudGlmaWVyRmllbGQgLSB0aGUgbmFtZSBvZiB0aGUgcHJpbWFyeS1rZXktZmllbGRcclxuICogQHBhcmFtIHtzdHJpbmd9IGlkZW50aWZpZXJWYWx1ZSAtIHRoZSB2YWx1ZSAob2YgdGFibGUuZGF0YSkgZm9yIHRoaXMgcm93LiAoaWRlbnRpZmllclZhbHVlID0gdGFibGUuZGF0YVtyb3ddW2lkZW50aWZpZXJGaWVsZF0pXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IC0gdGhlIHF1ZXJ5IHRvIGJlIHNlbmQgdG8gdGhlIGRiXHJcbiAqL1xyXG5jb25zdCBpbnNlcnRRdWVyeSA9IChkYXRhYmFzZVRhYmxlLCBpZGVudGlmaWVyRmllbGQsIGlkZW50aWZpZXJWYWx1ZSkgPT4gYElOU0VSVCBJTlRPICR7ZGF0YWJhc2VUYWJsZX0gKGlkZW50aWZpZXJGaWVsZCwgaWRlbnRpZmllclZhbHVlKSBWQUxVRVMgKCcke2lkZW50aWZpZXJGaWVsZH0nLCAnJHtpZGVudGlmaWVyVmFsdWV9Jyk7YDtcclxuXHJcbi8qKlxyXG4gKiBBIHF1ZXJ5IHRvIGRlbGV0ZSBhbGwgdmFsdWVzIGZyb20gdGhlIHRhYmxlLCB3aGljaCBoYXZlIG1hdGNoaW5nIGlkZW50aWZpZXItZmllbGRzIGFuZCAtdmFsdWVzLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZGF0YWJhc2VUYWJsZSAtIG5hbWUgb2YgdGhlIHRhYmxlXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZGVudGlmaWVyRmllbGQgLSB0aGUgbmFtZSBvZiB0aGUgcHJpbWFyeS1rZXktZmllbGRcclxuICogQHBhcmFtIHtzdHJpbmd9IGlkZW50aWZpZXJWYWx1ZSAtIHRoZSB2YWx1ZSAob2YgdGFibGUuZGF0YSkgZm9yIHRoaXMgcm93LiAoaWRlbnRpZmllclZhbHVlID0gdGFibGUuZGF0YVtyb3ddW2lkZW50aWZpZXJGaWVsZF0pXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IC0gdGhlIHF1ZXJ5IHRvIGJlIHNlbmQgdG8gdGhlIGRiXHJcbiAqL1xyXG5jb25zdCBkZWxldGVRdWVyeSA9IChkYXRhYmFzZVRhYmxlLCBpZGVudGlmaWVyRmllbGQsIGlkZW50aWZpZXJWYWx1ZSkgPT4gYERFTEVURSBGUk9NICR7ZGF0YWJhc2VUYWJsZX0gV0hFUkUgaWRlbnRpZmllckZpZWxkID0gJyR7aWRlbnRpZmllckZpZWxkfScgQU5EIGlkZW50aWZpZXJWYWx1ZSA9ICcke2lkZW50aWZpZXJWYWx1ZX0nO2A7XHJcblxyXG4vKipcclxuICogU2FuaXRpemVzIHVzZXIgY29udHJvbGxlZCBpbnB1dCBmb3IgdXNlIGluIHNxbCBxdWVyaWVzLiBUT0RPOiBuZWVkcyB0byBiZSBpbXBsZW1lbnRlZCBvbiB0aGUgc2VydmVyLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3FsIC0gdW5zYW5pdGl6ZWQgc3FsIGlucHV0XHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IC0gc2FuaXRpemVkIHNxbCBpbnB1dFxyXG4gKi9cclxuZnVuY3Rpb24gc2FuaXRpemVTcWwoc3FsKSB7IHRocm93IG5ldyBFcnJvcigndW5pbXBsZW1lbnRlZCBmdW5jdGlvbicpOyB9XHJcblxyXG4vKipcclxuICogU2VhcmNoZXMgZm9yIHRoZSBjbG9zZXN0IGFuY2VzdG9yIGVsZW1lbnQsIHRoYXQgaXMgYSB3Yy1ncmlkLXRhYmxlIG9yIGV4dGVuZHMgZnJvbSBpdC5cclxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudFxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfEhUTUxFbGVtZW50fSAtIHRoZSBjbG9zZXN0IGFuY2VzdG9yIGVsZW1lbnQsIHRoYXQgaXMgYSB3Yy1ncmlkLXRhYmxlXHJcbiAqL1xyXG5mdW5jdGlvbiBzZWFyY2hQYXJlbnRUYWJsZShlbGVtZW50KSB7XHJcbiAgICBsZXQgY3VycmVudEVsZW1lbnQgPSBlbGVtZW50O1xyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICBjdXJyZW50RWxlbWVudCA9IGN1cnJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQ7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRFbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ2JvZHknKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50RWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09ICdwcm90LXRhYmxlLXYzJyB8fCBjdXJyZW50RWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09ICd3Yy1ncmlkLXRhYmxlJykge1xyXG4gICAgICAgICAgICByZXR1cm4gY3VycmVudEVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5jbGFzcyBNYXJrSW5wdXQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XHJcbiAgICAvKipcclxuICAgICAqIExpZmVob29rIG9mIHdlYmNvbXBvbmVudHMsIHRoYXQgaXMgY2FsbGVkLCB3aGVuIHRoZSBjb21wb25lbnQgaGFzIGxvYWRlZC4gXHJcbiAgICAgKi9cclxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xyXG4gICAgICAgIC8vIHN1cGVyLmNvbm5lY3RlZENhbGxiYWNrKCk7XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEEgc3RvcmUgZm9yIFZhbHVlcyB0aGF0IGFyZSBtZWFudCB0byBiZSBzZXQgYnkgdGhpcyBlbGVtZW50cyBhdHRyaWJ1dGVzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZGF0YUF0dHJpYnV0ZXMgPSB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgdGFibGUgZmllbGQsIHRoYXQgaXMgdXNlZCBhcyBwcmltYXJ5IGtleS4gQXR0cmlidXRlIFwiaWRlbnRpZmllcmZpZWxkXCIgcmVxdWlyZWQhXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBJZGVudGlmaWVyRmllbGQ6IHRoaXMuZ2V0QXR0cmlidXRlKCdpZGVudGlmaWVyZmllbGQnKSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgdGFibGUgdmFsdWUgb2YgdGhlIGRhdGEuSWRlbnRpZmllckZpZWxkIGZvciB0aGlzIHJvdy4gQ2FuIGJlIHNldCBieSBhZGRpbmcgdGhlIFwiaWRlbnRpZmllcmZpZWxkXCIgYXR0cmlidXRlLiBUaGUgXCJpZGVudGlmaWVyZmllbGRcIiBhdHRyaWJ1dGUgaXMgcmVxdWlyZWQhIFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgSWRlbnRpZmllclZhbHVlOiB0aGlzLmdldEF0dHJpYnV0ZSgnaWRlbnRpZmllcnZhbHVlJyksXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIGRhdGFiYXNlIGluIFNRTFNlcnZlciwgd2hlcmUgdGhlIERhdGFiYXNlVGFibGUgaXMgc3VwcG9zZWQgdG8gYmUuIENhbiBiZSBzZXQgdmlhIHRoZSBcImRhdGFiYXNlXCIgYXR0cmlidXRlIGFuZCBpcyBvcHRpb25hbCAoZGVmYXVsdDogXCJNYXJrZXJEQlwiKS4gXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBEYXRhYmFzZTogdGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGFiYXNlJykgPyB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YWJhc2UnKSA6IFwiTWFya2VyREJcIixcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgZGF0YWJhc2UgdXNlciwgdGhhdCBpcyB1c2VkIGZvciBzYXZpbmcgZGF0YSB0byB0aGUgZGIuIElzIHNldCBieSB0aGUgXCJkYXRhYmFzZXVzZXJcIiBhdHRyaWJ1dGUsIHdoaWNoIGlzIG9wdGlvbmFsIChkZWZhdWx0OiBcIndpa2lcIikhXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBEYXRhYmFzZVVzZXI6IHRoaXMuZ2V0QXR0cmlidXRlKCdkYXRhYmFzZXVzZXInKSA/IHRoaXMuZ2V0QXR0cmlidXRlKCdkYXRhYmFzZXVzZXInKSA6IFwid2lraVwiLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSB0YWJsZW5hbWUgZm9yIFNRTFNlcnZlciwgd2hlcmUgdGhlIG1hcmtlZCB2YWx1ZXMgYXJlIHNhdmVkLiBUaGUgYXR0cmlidXRlIFwiZGF0YWJhc2VUYWJsZVwiIGlzIG5vdCBhYnNvbHV0bHkgcmVxdWlyZWQsIGJ1dCB0aGUgZGVmYXVsdCB0YWJsZSBpcyBvbmx5IGEgZmFsbGJhY2sgYW5kIGl0IHNob3VsZCBub3QgYmUgdXNlZCAoZGVmYXVsdDogXCJEZWZhdWx0VGFibGVcIikhXHJcbiAgICAgICAgICAgICAqIFRPRE86IHRhYmxlIGNyZWF0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZCB5ZXQuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBEYXRhYmFzZVRhYmxlOiB0aGlzLmdldEF0dHJpYnV0ZSgnZGF0YWJhc2V0YWJsZScpID8gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGFiYXNldGFibGUnKSA6IFwiRGVmYXVsdFRhYmxlXCIsXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogV2hlbiB0aGUgaHRtbCBhdHRyaWJ1dGUgXCJjaGVja2VkXCIgaXMgc2V0LCB0aGUgY2hlY2tib3ggaXMgbWFya2VkLiBPcHRpb25hbCAoZGVmYXVsdDogZmFsc2UpIVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgSXNDaGVja2VkOiB0aGlzLmhhc0F0dHJpYnV0ZSgnY2hlY2tlZCcpLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSB0ZXh0LCB3aGljaCBpcyBhZGRlZCB0byB0aGUgY2hlY2tib3gsIHNvIHRoYXQgaXQgY2FuIGJlIGZpbHRlcmVkIHdpdGggdGFibGUuIE1hcmtlclRleHQgbmVlZHMgdG8gYmUgYSBzdHJpbmcgd2l0aCBcInxcIiBhcyBzZXBhcmV0b3IgY2hhcmFjdGVyLiBMZWZ0IHZhbHVlIGlzIGZvciBjaGVja2VkLCByaWdodCBmb3IgdW5jaGVja2VkLiBPcHRpb25hbCAoZGVmYXVsdDogXCItMXwwXCIpIFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgTWFya2VyVGV4dDogdGhpcy5nZXRBdHRyaWJ1dGUoJ21hcmtlcnRleHQnKSA/IHRoaXMuZ2V0QXR0cmlidXRlKCdtYXJrZXJ0ZXh0JykgOiBcIi0xfDBcIixcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBIHN0b3JlIGZvciB2YWx1ZXMsIHRoYXQgYXJlIGRldGVybWluZWQgYXV0b21hdGljYWxseSBvciBkZXBlbmRlbnQgb24gdGhvc2Ugc2V0IGluIGRhdGFBdHRyaWJ1dGVzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuZGF0YVByb3BlcnRpZXMgPSB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgcHJvdC10YWJsZSB3aXRoIGlzIHRoZSBjbG9zZXN0IGFuY2VzdG9yIG9mIHRoaXMgZWxlbWVudC4gIFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgUGFyZW50VGFibGU6IHNlYXJjaFBhcmVudFRhYmxlKHRoaXMpLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSB1cmwgZm9yIHRoZSBkYXRhYmFzZSB0aGF0IGlzIHNldCBpbiBcImRhdGFBdHRyaWJ1dGVzLkRhdGFiYXNlXCIuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBEYXRhYmFzZVVybDogZGF0YWJhc2VVcmwodGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZSwgdGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZVVzZXIpLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBxdWVyeSBmb3IgY3JlYXRpbmcgdGhlIHRhYmxlIChpZiBpdCBkb2Vzbid0IGV4aXN0KS4gXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBDcmVhdGVUYWJsZVF1ZXJ5OiBjcmVhdGVUYWJsZVF1ZXJ5LmJpbmQodGhpcywgdGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZVRhYmxlKSxcclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUaGUgcXVlcnkgZm9yIGluc2VydGluZyBkYXRhIGludG8gdGhlIHRhYmxlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgSW5zZXJ0VmFsdWVzUXVlcnk6IGluc2VydFF1ZXJ5LmJpbmQodGhpcywgdGhpcy5kYXRhQXR0cmlidXRlcy5EYXRhYmFzZVRhYmxlLCB0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJGaWVsZCwgdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWUpLFxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBxdWVyeSBmb3IgZGVsZXRpbmcgZGF0YSBmcm9tIHRoZSB0YWJsZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIERlbGV0ZUZyb21RdWVyeTogZGVsZXRlUXVlcnkuYmluZCh0aGlzLCB0aGlzLmRhdGFBdHRyaWJ1dGVzLkRhdGFiYXNlVGFibGUsIHRoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllckZpZWxkLCB0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJWYWx1ZSksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQSBzdG9yZSBmb3IgZWxlbWVudHMgdXNlZCBpbiB0aGlzIGNvbXBvbmVudC5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cyA9IHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIFRoZSBjaGVja2JveCwgd2hpY2ggZGlzcGxheXMgdGhlIGN1cnJlbnQgc3RhdGUgb2YgXCJkYXRhQXR0cmlidXRlcy5Jc0NoZWNrZWRcIi5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIENoZWNrYm94SW5wdXQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0JyksXHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogVGhlIHNwYW4gZWxlbWVudCwgd2hpY2ggaGFzIHRhYmxlIGZpbHRlcmFibGUsIGludmlzaWJsZSB0ZXh0IGluc2lkZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIEZpbHRlclRleHRTcGFuOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coYGNoZWNrZWQ6ICR7dGhpcy5kYXRhQXR0cmlidXRlcy5Jc0NoZWNrZWR9YCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmRhdGFBdHRyaWJ1dGVzLklzQ2hlY2tlZCkgdGhpcy5zZXRDaGVja2VkKGZhbHNlKTtcclxuICAgICAgICBlbHNlIHRoaXMudW5zZXRDaGVja2VkKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0dXBNYXJrSW5wdXRFbGVtZW50KCk7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVDaGVja2JveElucHV0KCk7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVGaWx0ZXJFbGVtZW50KCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0dXBNYXJrSW5wdXRFbGVtZW50KCkge1xyXG4gICAgICAgIHRoaXMuY2xhc3NMaXN0LmFkZChgbWFya2VyXyR7dGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWV9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgdGhlIGNoZWNrYm94IGlucHV0IGFuZCBhZGQgaXQgdG8gdGhpcyBDb21wb25lbnRzIEhUTUwgQ29udGV4dC5cclxuICAgICAqL1xyXG4gICAgY3JlYXRlQ2hlY2tib3hJbnB1dCgpIHtcclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cy5DaGVja2JveElucHV0LnR5cGUgPSAnY2hlY2tib3gnO1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQub25jbGljayA9IHRoaXMuY2xpY2tFdmVudEhhbmRsZXIuYmluZCh0aGlzKTtcclxuICAgICAgICBpZiAodGhpcy5kYXRhQXR0cmlidXRlcy5Jc0NoZWNrZWQpIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQudG9nZ2xlQXR0cmlidXRlKCdjaGVja2VkJywgdHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5hcHBlbmQodGhpcy5kYXRhRWxlbWVudHMuQ2hlY2tib3hJbnB1dCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgdGhlIHNwYW4sIHRoYXQgaXMgdXNlZCB0byBmaWx0ZXIgYW5kIHNvcnQgbWFya2VkIGRhdGEuXHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZUZpbHRlckVsZW1lbnQoKSB7XHJcbiAgICAgICAgbGV0IFttYXJrZWRUZXh0LCB1bm1hcmtlZFRleHRdID0gdGhpcy5kYXRhQXR0cmlidXRlcy5NYXJrZXJUZXh0LnNwbGl0KCd8Jyk7XHJcbiAgICAgICAgdGhpcy5kYXRhRWxlbWVudHMuRmlsdGVyVGV4dFNwYW4uc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkZpbHRlclRleHRTcGFuLnRleHRDb250ZW50ID0gdGhpcy5kYXRhQXR0cmlidXRlcy5Jc0NoZWNrZWQgPyBtYXJrZWRUZXh0IDogdW5tYXJrZWRUZXh0O1xyXG4gICAgICAgIHRoaXMuYXBwZW5kKHRoaXMuZGF0YUVsZW1lbnRzLkZpbHRlclRleHRTcGFuKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENoYW5nZSBhbGwgbmVjYXNzYXJyeSB2YWx1ZXMsIHdoZW4gdGhlIHN0YXR1cyBvZiBJc0NoZWNrZWQgY2hhbmdlcyB0byB0cnVlLlxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSB1cGRhdGVUYWJsZSAtIHRydWUgbWVhbnMgdGhlIHJlc3Qgb2YgdGhlIHRhYmxlIGlzIGdldHRpbmcgYW4gc2V0Q2hlY2tlZChmYWxzZSkgY2FsbC5cclxuICAgICAqL1xyXG4gICAgc2V0Q2hlY2tlZCh1cGRhdGVUYWJsZSkge1xyXG4gICAgICAgIHRoaXMuZGF0YUF0dHJpYnV0ZXMuSXNDaGVja2VkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLnRvZ2dsZUF0dHJpYnV0ZSgnY2hlY2tlZCcsIHRydWUpO1xyXG4gICAgICAgIHRoaXMuZGF0YUVsZW1lbnRzLkNoZWNrYm94SW5wdXQudG9nZ2xlQXR0cmlidXRlKCdjaGVja2VkJywgdHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5kYXRhRWxlbWVudHMuQ2hlY2tib3hJbnB1dC5jaGVja2VkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cy5GaWx0ZXJUZXh0U3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuZGF0YUF0dHJpYnV0ZXMuTWFya2VyVGV4dC5zcGxpdCgnfCcpWzBdO1xyXG4gICAgICAgIC8vIGlmICh1cGRhdGVUYWJsZSkgdGhpcy5kYXRhUHJvcGVydGllcy5QYXJlbnRUYWJsZS5kYXRhLmZpbHRlcigoZW50cnkpID0+IChjb25zb2xlLmxvZyhlbnRyeVsnbWFya2VyJ10pLCBlbnRyeVt0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJGaWVsZF0gPT0gdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWUpKS5tYXAoZW50cnkgPT4gKGVudHJ5WydtYXJrZXInXS5zZXRDaGVja2VkKGZhbHNlKSkpO1xyXG4gICAgICAgIGlmICh1cGRhdGVUYWJsZSkgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChgLnRhYmxlLWlkLSR7dGhpcy5kYXRhUHJvcGVydGllcy5QYXJlbnRUYWJsZS50YWJsZUlkfSBtYXJrLWlucHV0Lm1hcmtlcl8ke3RoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllclZhbHVlfWApLmZvckVhY2goXHJcbiAgICAgICAgICAgIChtYXJrZXIpID0+IChtYXJrZXIuc2V0Q2hlY2tlZChmYWxzZSkpXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENoYW5nZSBhbGwgbmVjYXNzYXJyeSB2YWx1ZXMsIHdoZW4gdGhlIHN0YXR1cyBvZiBJc0NoZWNrZWQgY2hhbmdlcyB0byBmYWxzZS5cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdXBkYXRlVGFibGUgLSB0cnVlIG1lYW5zIHRoZSByZXN0IG9mIHRoZSB0YWJsZSBpcyBnZXR0aW5nIGFuIHNldENoZWNrZWQoZmFsc2UpIGNhbGwuXHJcbiAgICAgKi9cclxuICAgIHVuc2V0Q2hlY2tlZCh1cGRhdGVUYWJsZSkge1xyXG4gICAgICAgIHRoaXMuZGF0YUF0dHJpYnV0ZXMuSXNDaGVja2VkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy50b2dnbGVBdHRyaWJ1dGUoJ2NoZWNrZWQnLCBmYWxzZSk7XHJcbiAgICAgICAgdGhpcy5kYXRhRWxlbWVudHMuQ2hlY2tib3hJbnB1dC5yZW1vdmVBdHRyaWJ1dGUoJ2NoZWNrZWQnKTtcclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cy5DaGVja2JveElucHV0LmNoZWNrZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmRhdGFFbGVtZW50cy5GaWx0ZXJUZXh0U3Bhbi50ZXh0Q29udGVudCA9IHRoaXMuZGF0YUF0dHJpYnV0ZXMuTWFya2VyVGV4dC5zcGxpdCgnfCcpWzFdO1xyXG4gICAgICAgIC8vIGlmICh1cGRhdGVUYWJsZSkgdGhpcy5kYXRhUHJvcGVydGllcy5QYXJlbnRUYWJsZS5kYXRhLmZpbHRlcigoZW50cnkpID0+IChlbnRyeVt0aGlzLmRhdGFBdHRyaWJ1dGVzLklkZW50aWZpZXJGaWVsZF0gPT0gdGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWUpKS5tYXAoZW50cnkgPT4gKGVudHJ5W3RoaXMuZGF0YUF0dHJpYnV0ZXMuSWRlbnRpZmllckZpZWxkXS51bnNldENoZWNrZWQoZmFsc2UpKSk7XHJcbiAgICAgICAgaWYgKHVwZGF0ZVRhYmxlKSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGAudGFibGUtaWQtJHt0aGlzLmRhdGFQcm9wZXJ0aWVzLlBhcmVudFRhYmxlLnRhYmxlSWR9IG1hcmstaW5wdXQubWFya2VyXyR7dGhpcy5kYXRhQXR0cmlidXRlcy5JZGVudGlmaWVyVmFsdWV9YCkuZm9yRWFjaChcclxuICAgICAgICAgICAgKG1hcmtlcikgPT4gKG1hcmtlci51bnNldENoZWNrZWQoZmFsc2UpKVxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgdGhlIHRhYmxlIGluIFNRTFNlcnZlciwgaWYgaXQgZG9lc24ndCBhbHJlYWR5IGV4aXN0LlxyXG4gICAgICogVE9ETzogTmVlZHMgdG8gYmUgY2FsbGVkIG9uY2UgZm9yIGFsbCBcIk1hcmtJbnB1dFwiIGVsZW1lbnRzIGluc2lkZSBvZiBhIHRhYmxlLiBcclxuICAgICAqL1xyXG4gICAgY3JlYXRlVGFibGUoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5kYXRhUHJvcGVydGllcy5DcmVhdGVUYWJsZVF1ZXJ5KCkpO1xyXG4gICAgICAgIGZldGNoKHRoaXMuZGF0YVByb3BlcnRpZXMuRGF0YWJhc2VVcmwsIHtcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgaGVhZGVyczogaGVhZGVyLFxyXG4gICAgICAgICAgICAgICAgYm9keTogY3JlYXRlRmV0Y2hCb2R5KHRoaXMuZGF0YVByb3BlcnRpZXMuQ3JlYXRlVGFibGVRdWVyeSksXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmaW5pc2hlZCB0YWJsZSBjcmVhdGUgcXVlcnkuJyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogSGFuZGxlcyB0aGUgY2xpY2sgZXZlbnQgb24gdGhlIGNoZWNrYm94IGVsZW1lbnQuXHJcbiAgICAgKiBAcGFyYW0ge0NsaWNrRXZlbnR9IGV2ZW50IFxyXG4gICAgICovXHJcbiAgICBjbGlja0V2ZW50SGFuZGxlcihldmVudCkge1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgaWYgKHRoaXMuZGF0YUF0dHJpYnV0ZXMuSXNDaGVja2VkKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuZGF0YVByb3BlcnRpZXMuRGVsZXRlRnJvbVF1ZXJ5KCkpO1xyXG4gICAgICAgICAgICBmZXRjaCh0aGlzLmRhdGFQcm9wZXJ0aWVzLkRhdGFiYXNlVXJsLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogaGVhZGVyLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6IGNyZWF0ZUZldGNoQm9keSh0aGlzLmRhdGFQcm9wZXJ0aWVzLkRlbGV0ZUZyb21RdWVyeSksXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bnNldENoZWNrZWQodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmRhdGFQcm9wZXJ0aWVzLkluc2VydFZhbHVlc1F1ZXJ5KCkpO1xyXG4gICAgICAgICAgICBmZXRjaCh0aGlzLmRhdGFQcm9wZXJ0aWVzLkRhdGFiYXNlVXJsLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogaGVhZGVyLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6IGNyZWF0ZUZldGNoQm9keSh0aGlzLmRhdGFQcm9wZXJ0aWVzLkluc2VydFZhbHVlc1F1ZXJ5KSxcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgICAgICAgICAgICAudGhlbihkYXRhID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldENoZWNrZWQodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGZXRjaGVzIHRoZSBsaXN0IG9mIGNoZWNrZWQgdmFsdWVzLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZGIgLSBkYXRhYmFzZSBuYW1lXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYnVzZXIgLSBkYXRhYmFzZSB1c2VyXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBkYlRhYmxlIC0gZGF0YWJhc2UgdGFibGVcclxuICogQHBhcmFtIHtzdHJpbmd9IGlkRmllbGQgLSBpZGVudGlmaWVyIGZpZWxkXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPGFueT59IC0gYSBwcm9taXNlIG9mIHRoZSByZWNlaXZlZCBqc29uIGxpc3QgXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBmZXRjaFNlbGVjdENoZWNrZWRWYWx1ZXMoZGIsIGRidXNlciwgZGJUYWJsZSwgaWRGaWVsZCkge1xyXG4gICAgcmV0dXJuIGZldGNoKGRhdGFiYXNlVXJsKGRiLCBkYnVzZXIpLCB7XHJcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICBoZWFkZXJzOiBoZWFkZXIsXHJcbiAgICAgICAgICAgIGJvZHk6IGNyZWF0ZUZldGNoQm9keShzZWxlY3RDaGVja2VkRm9yQWxsLmJpbmQodGhpcywgZGJUYWJsZSwgaWRGaWVsZCkpLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gKHJlc3BvbnNlLmpzb24oKSkpXHJcbiAgICAgICAgLnRoZW4oZGF0YSA9PiB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICB9KTtcclxufVxyXG5cclxuLy8gY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdtYXJrLWlucHV0JywgTWFya0lucHV0KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgTWFya0lucHV0LFxyXG4gICAgZmV0Y2hTZWxlY3RDaGVja2VkVmFsdWVzXHJcbn07IiwibGV0IHdjR3JpZFRhYmxlID0gcmVxdWlyZShcIndjLWdyaWQtdGFibGUvc3JjL3djLWdyaWQtdGFibGUuanNcIik7XHJcbmxldCB7IE1hcmtJbnB1dCwgZmV0Y2hTZWxlY3RDaGVja2VkVmFsdWVzIH0gPSByZXF1aXJlKFwiLi9NYXJrSW5wdXRcIik7XHJcblxyXG5yZXF1aXJlKCcuL3N0eWxlLmNzcycpO1xyXG4vLyB3Y0dyaWRUYWJsZS5kZWZpbmVDdXN0b21FbGVtZW50KClcclxuXHJcbmNsYXNzIFByb3RUYWJsZSBleHRlbmRzIHdjR3JpZFRhYmxlLlRhYmxlQ29tcG9uZW50IHtcclxuICAgIHVzZURlZmF1bHRPcHRpb25zKCkge1xyXG4gICAgICAgIHN1cGVyLnVzZURlZmF1bHRPcHRpb25zKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xyXG4gICAgICAgIHN1cGVyLmNvbm5lY3RlZENhbGxiYWNrKCk7XHJcblxyXG4gICAgICAgIGxldCBoZWlnaHQgPSB0aGlzLmdldEF0dHJpYnV0ZSgnaGVpZ2h0Jyk7XHJcbiAgICAgICAgbGV0IHBhZ2VTaXplID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3BhZ2Utc2l6ZScpO1xyXG5cclxuICAgICAgICBpZiAoaGVpZ2h0KSB0aGlzLnN0eWxlLm1heEhlaWdodCA9IGhlaWdodDtcclxuICAgICAgICBpZiAocGFnZVNpemUpIHtcclxuICAgICAgICAgICAgLy8gdGhpcy5wYWdpbmF0aW9uLnBhZ2VTaXplID0gTnVtYmVyLnBhcnNlSW50KHBhZ2VTaXplKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5vcHRpb25zLnBhZ2luYXRpb24ucGFnZVNpemUgPSBwYWdlU2l6ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnBhZ2luYXRpb24ucGFnZVNpemUgPSA1MDA7XHJcbiAgICAgICAgICAgIC8vIHRoaXMub3B0aW9ucy5wYWdpbmF0aW9uLnBhZ2VTaXplID0gNTAwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHRhYnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdkaXYudGFicyBkaXYudGFiLXBhbmUnKTtcclxuICAgICAgICBbLi4udGFic10uZm9yRWFjaCgodGFiKSA9PiB7XHJcbiAgICAgICAgICAgIHRhYi5hZGRDbGFzcyA9IG5ldyBQcm94eSh0YWIuYWRkQ2xhc3MsIHtcclxuICAgICAgICAgICAgICAgIGFwcGx5OiBmdW5jdGlvbih0YXJnZXQsIHRoaXNBcmcsIGFyZ0xpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYWRkQ2xhc3MgZml4LWNvbHVtbnMnKTtcclxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnZml4LWNvbHVtbnMnIH0pLCAnKicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXQuYXBwbHkodGhpc0FyZywgYXJnTGlzdCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgLy8gZmV0Y2goJ2h0dHA6Ly8xMC4xOS4yOC45NDo1OTg1L2FuZ19wcm90LXdpa2kvcHJvdC13aWtpX0xlZ2VuZGUnKVxyXG4gICAgICAgIGZldGNoKCdodHRwczovLzEwLjE5LjI4Ljk0OjgwODQvcXVlcnk/ZGF0YWJhc2U9Zm9ybWx5Jywge1xyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGJvZHk6IGB7XCJxdWVyeVwiOiBcIlNFTEVDVCBbc3lub255bV0sIFtsaW5rXSwgW3Rvb2x0aXBdIEZST00gc2NoZW1hQXVza3VuZnRMaW5rcztcIn1gXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcclxuICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGxpbmtzID0gcmVzcG9uc2UubWFwKGVudHJ5ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RW50cnkgPSB7fVxyXG4gICAgICAgICAgICAgICAgICAgIG5ld0VudHJ5W2VudHJ5LnN5bm9ueW1dID0gZW50cnkubGluaztcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3RW50cnk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGxpbmtzKS5mb3JFYWNoKGtleSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRtcCA9IGxpbmtzW2tleV07XHJcbiAgICAgICAgICAgICAgICAgICAgbGlua3Nba2V5XSA9IFsodmFsdWUpID0+IGA8YSBocmVmPVwiJHt0bXB9JHt2YWx1ZX1cIj4ke3ZhbHVlfTwvYT5gXVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIHRoaXMuZm9ybWF0dGVyID0gbGlua3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldHVwUHJvdFRhYmxlRGF0YSgpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuY2F0Y2goZXJyID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY2F1Z2h0LlwiKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dXBQcm90VGFibGVEYXRhKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXR1cFByb3RUYWJsZURhdGEoKSB7XHJcblxyXG4gICAgICAgIGxldCBqc29uVXJsID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RhdGFfdXJsJyk7XHJcbiAgICAgICAgaWYgKGpzb25VcmwpIHtcclxuICAgICAgICAgICAgZmV0Y2goanNvblVybClcclxuICAgICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4gZGF0YS5qc29uKCkpXHJcbiAgICAgICAgICAgICAgICAudGhlbihkYXRhID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHVwTWFya0lucHV0cyhkYXRhKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihtYXJrRGF0YSA9PiB0aGlzLnNldERhdGEobWFya0RhdGEpKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFNldHMgdXAgdGhlIG1hcmtlciBjb2x1bW4sIGJ1dCBvbmx5IHdoZW4gYWxsIG9mIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGVzIGV4aXN0LlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSB0YWJsZSBkYXRhXHJcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIHRhYmxlIGRhdGFcclxuICAgICAqL1xyXG4gICAgYXN5bmMgc2V0dXBNYXJrSW5wdXRzKGRhdGEpIHtcclxuICAgICAgICBjb25zdCByZXF1aXJlZEF0dHJpYnV0ZXMgPSB7XHJcbiAgICAgICAgICAgIGlkZW50aWZpZXJGaWVsZDogdGhpcy5nZXRBdHRyaWJ1dGUoJ21hcmtlcl9pZGVudGlmaWVyZmllbGQnKSxcclxuICAgICAgICAgICAgZGF0YWJhc2VUYWJsZTogdGhpcy5nZXRBdHRyaWJ1dGUoJ21hcmtlcl9kYXRhYmFzZXRhYmxlJyksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3Qgb3B0aW9uYWxBdHRyaWJ1dGVzID0ge1xyXG4gICAgICAgICAgICBkYXRhYmFzZTogdGhpcy5nZXRBdHRyaWJ1dGUoJ21hcmtlcl9kYXRhYmFzZScpLFxyXG4gICAgICAgICAgICBkYXRhYmFzZXVzZXI6IHRoaXMuZ2V0QXR0cmlidXRlKCdtYXJrZXJfZGF0YWJhc2V1c2VyJyksXHJcbiAgICAgICAgICAgIG1hcmtlclRleHQ6IHRoaXMuZ2V0QXR0cmlidXRlKCdtYXJrZXJfbWFya2VydGV4dCcpLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmIChSZWZsZWN0Lm93bktleXMocmVxdWlyZWRBdHRyaWJ1dGVzKS5tYXAoKGtleSkgPT4gcmVxdWlyZWRBdHRyaWJ1dGVzW2tleV0pLmV2ZXJ5KCh2YWx1ZSkgPT4gKHZhbHVlID09PSB1bmRlZmluZWQgPyBmYWxzZSA6IHRydWUpKSkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGVNYXJrSW5wdXREYXRhKGRhdGEsIHJlcXVpcmVkQXR0cmlidXRlcywgb3B0aW9uYWxBdHRyaWJ1dGVzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGVzIGEgTWFya0lucHV0IGVsZW1lbnQuXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWRlbnRpZmllckZpZWxkXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWRlbnRpZmllclZhbHVlXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGFibGVuYW1lXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGF0YWJhc2VcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkYnVzZXJcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtYXJrZXJcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gY2hlY2tlZFxyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBNYXJrSW5wdXQgb3V0ZXIgaHRtbFxyXG4gICAgICovXHJcbiAgICBjcmVhdGVNYXJrSW5wdXQoaWRlbnRpZmllckZpZWxkLCBpZGVudGlmaWVyVmFsdWUsIHRhYmxlbmFtZSwgZGF0YWJhc2UsIGRidXNlciwgbWFya2VyLCBjaGVja2VkKSB7XHJcbiAgICAgICAgbGV0IG1hcmtJbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ21hcmstaW5wdXQnKTtcclxuICAgICAgICBtYXJrSW5wdXQuc2V0QXR0cmlidXRlKCdpZGVudGlmaWVyZmllbGQnLCBpZGVudGlmaWVyRmllbGQpO1xyXG4gICAgICAgIG1hcmtJbnB1dC5zZXRBdHRyaWJ1dGUoJ2lkZW50aWZpZXJ2YWx1ZScsIGlkZW50aWZpZXJWYWx1ZSk7XHJcbiAgICAgICAgaWYgKHRhYmxlbmFtZSkgbWFya0lucHV0LnNldEF0dHJpYnV0ZSgnZGF0YWJhc2V0YWJsZScsIHRhYmxlbmFtZSk7XHJcbiAgICAgICAgaWYgKGRhdGFiYXNlKSBtYXJrSW5wdXQuc2V0QXR0cmlidXRlKCdkYXRhYmFzZScsIGRhdGFiYXNlKTtcclxuICAgICAgICBpZiAoZGJ1c2VyKSBtYXJrSW5wdXQuc2V0QXR0cmlidXRlKCdkYXRhYmFzZXVzZXInLCBkYnVzZXIpO1xyXG4gICAgICAgIGlmIChtYXJrZXIpIG1hcmtJbnB1dC5zZXRBdHRyaWJ1dGUoJ21hcmtlcnRleHQnLCBtYXJrZXIpO1xyXG4gICAgICAgIGlmIChjaGVja2VkKSBtYXJrSW5wdXQudG9nZ2xlQXR0cmlidXRlKCdjaGVja2VkJywgY2hlY2tlZCk7XHJcbiAgICAgICAgcmV0dXJuIG1hcmtJbnB1dC5vdXRlckhUTUw7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZW5lcmF0ZXMgdGhlIGRhdGEgZm9yIHRoZSB0YWJsZSwgd2hpY2ggaW5jbHVkZXMgYSByb3cgd2l0aCBNYXJrZXJJbnB1dHMuXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIHRhYmxlIGRhdGFcclxuICAgICAqIEBwYXJhbSB7e2lkZW50aWZpZXJGaWVsZDogc3RyaW5nLCBkYXRhYmFzZVRhYmxlOiBzdHJpbmd9fSByZXFBdHRyIC0gcmVxdWlyZWQgTWFya0lucHV0IGF0dHJpYnV0ZXNcclxuICAgICAqIEBwYXJhbSB7e2RhdGFiYXNlPzogc3RyaW5nLCBkYXRhYmFzZXVzZXI/OiBzdHJpbmcsIG1hcmtlclRleHQ/OiBzdHJpbmd9fSBvcHRBdHRyIC0gb3B0aW9uYWwgTWFya0lucHV0IGF0dHJpYnV0ZXNcclxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gdGFibGUgZGF0YVxyXG4gICAgICovXHJcbiAgICBhc3luYyBnZW5lcmF0ZU1hcmtJbnB1dERhdGEoZGF0YSwgcmVxQXR0ciwgb3B0QXR0cikge1xyXG4gICAgICAgIGxldCB7IGlkZW50aWZpZXJGaWVsZCwgZGF0YWJhc2VUYWJsZSB9ID0gcmVxQXR0cjtcclxuICAgICAgICBsZXQgeyBkYXRhYmFzZSwgZGF0YWJhc2V1c2VyLCBtYXJrZXJUZXh0IH0gPSBvcHRBdHRyO1xyXG5cclxuICAgICAgICBkYXRhYmFzZSA9IGRhdGFiYXNlID8gZGF0YWJhc2UgOiBcIk1hcmtlckRCXCI7XHJcbiAgICAgICAgZGF0YWJhc2V1c2VyID0gZGF0YWJhc2V1c2VyID8gZGF0YWJhc2V1c2VyIDogXCJ3aWtpXCI7XHJcbiAgICAgICAgLy8gZGF0YWJhc2VUYWJsZSA9IGRhdGFiYXNlVGFibGUgPyBkYXRhYmFzZVRhYmxlIDogXCJEZWZhdWx0VGFibGVcIjtcclxuICAgICAgICBtYXJrZXJUZXh0ID0gbWFya2VyVGV4dCA/IG1hcmtlclRleHQgOiBcImpqanxubm5cIjtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZldGNoU2VsZWN0Q2hlY2tlZFZhbHVlcyhkYXRhYmFzZSwgZGF0YWJhc2V1c2VyLCBkYXRhYmFzZVRhYmxlLCBpZGVudGlmaWVyRmllbGQpXHJcbiAgICAgICAgICAgIC50aGVuKChjaGVja2VkRGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubWFwKChlbnRyeSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjaGVja2VkID0gY2hlY2tlZERhdGEubWFwKCh2YWx1ZSkgPT4gdmFsdWUuaWRlbnRpZmllclZhbHVlKS5pbmNsdWRlcyhlbnRyeVtpZGVudGlmaWVyRmllbGRdLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICdtYXJrZXInOiB0aGlzLmNyZWF0ZU1hcmtJbnB1dChpZGVudGlmaWVyRmllbGQsIGVudHJ5W2lkZW50aWZpZXJGaWVsZF0udG9TdHJpbmcoKSwgZGF0YWJhc2VUYWJsZSwgZGF0YWJhc2UsIGRhdGFiYXNldXNlciwgbWFya2VyVGV4dCwgY2hlY2tlZCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLmVudHJ5LFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnbWFyay1pbnB1dCcsIE1hcmtJbnB1dCk7XHJcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncHJvdC10YWJsZS12MycsIFByb3RUYWJsZSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIFByb3RUYWJsZTogUHJvdFRhYmxlLFxyXG4gICAgVGFibGVDb21wb25lbnQ6IHdjR3JpZFRhYmxlLlRhYmxlQ29tcG9uZW50LFxyXG59OyIsIid1c2Ugc3RyaWN0Jztcbi8vIEZvciBtb3JlIGluZm9ybWF0aW9uIGFib3V0IGJyb3dzZXIgZmllbGQsIGNoZWNrIG91dCB0aGUgYnJvd3NlciBmaWVsZCBhdCBodHRwczovL2dpdGh1Yi5jb20vc3Vic3RhY2svYnJvd3NlcmlmeS1oYW5kYm9vayNicm93c2VyLWZpZWxkLlxuXG52YXIgc3R5bGVFbGVtZW50c0luc2VydGVkQXRUb3AgPSBbXTtcblxudmFyIGluc2VydFN0eWxlRWxlbWVudCA9IGZ1bmN0aW9uKHN0eWxlRWxlbWVudCwgb3B0aW9ucykge1xuICAgIHZhciBoZWFkID0gZG9jdW1lbnQuaGVhZCB8fCBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdO1xuICAgIHZhciBsYXN0U3R5bGVFbGVtZW50SW5zZXJ0ZWRBdFRvcCA9IHN0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wW3N0eWxlRWxlbWVudHNJbnNlcnRlZEF0VG9wLmxlbmd0aCAtIDFdO1xuXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucy5pbnNlcnRBdCA9IG9wdGlvbnMuaW5zZXJ0QXQgfHwgJ2JvdHRvbSc7XG5cbiAgICBpZiAob3B0aW9ucy5pbnNlcnRBdCA9PT0gJ3RvcCcpIHtcbiAgICAgICAgaWYgKCFsYXN0U3R5bGVFbGVtZW50SW5zZXJ0ZWRBdFRvcCkge1xuICAgICAgICAgICAgaGVhZC5pbnNlcnRCZWZvcmUoc3R5bGVFbGVtZW50LCBoZWFkLmZpcnN0Q2hpbGQpO1xuICAgICAgICB9IGVsc2UgaWYgKGxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wLm5leHRTaWJsaW5nKSB7XG4gICAgICAgICAgICBoZWFkLmluc2VydEJlZm9yZShzdHlsZUVsZW1lbnQsIGxhc3RTdHlsZUVsZW1lbnRJbnNlcnRlZEF0VG9wLm5leHRTaWJsaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGVFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBzdHlsZUVsZW1lbnRzSW5zZXJ0ZWRBdFRvcC5wdXNoKHN0eWxlRWxlbWVudCk7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmluc2VydEF0ID09PSAnYm90dG9tJykge1xuICAgICAgICBoZWFkLmFwcGVuZENoaWxkKHN0eWxlRWxlbWVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHZhbHVlIGZvciBwYXJhbWV0ZXIgXFwnaW5zZXJ0QXRcXCcuIE11c3QgYmUgXFwndG9wXFwnIG9yIFxcJ2JvdHRvbVxcJy4nKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvLyBDcmVhdGUgYSA8bGluaz4gdGFnIHdpdGggb3B0aW9uYWwgZGF0YSBhdHRyaWJ1dGVzXG4gICAgY3JlYXRlTGluazogZnVuY3Rpb24oaHJlZiwgYXR0cmlidXRlcykge1xuICAgICAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmhlYWQgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTtcbiAgICAgICAgdmFyIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG5cbiAgICAgICAgbGluay5ocmVmID0gaHJlZjtcbiAgICAgICAgbGluay5yZWwgPSAnc3R5bGVzaGVldCc7XG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGlmICggISBhdHRyaWJ1dGVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNba2V5XTtcbiAgICAgICAgICAgIGxpbmsuc2V0QXR0cmlidXRlKCdkYXRhLScgKyBrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgfSxcbiAgICAvLyBDcmVhdGUgYSA8c3R5bGU+IHRhZyB3aXRoIG9wdGlvbmFsIGRhdGEgYXR0cmlidXRlc1xuICAgIGNyZWF0ZVN0eWxlOiBmdW5jdGlvbihjc3NUZXh0LCBhdHRyaWJ1dGVzLCBleHRyYU9wdGlvbnMpIHtcbiAgICAgICAgZXh0cmFPcHRpb25zID0gZXh0cmFPcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgIHN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBpZiAoICEgYXR0cmlidXRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICAgICAgICBzdHlsZS5zZXRBdHRyaWJ1dGUoJ2RhdGEtJyArIGtleSwgdmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0eWxlLnNoZWV0KSB7IC8vIGZvciBqc2RvbSBhbmQgSUU5K1xuICAgICAgICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY3NzVGV4dDtcbiAgICAgICAgICAgIHN0eWxlLnNoZWV0LmNzc1RleHQgPSBjc3NUZXh0O1xuICAgICAgICAgICAgaW5zZXJ0U3R5bGVFbGVtZW50KHN0eWxlLCB7IGluc2VydEF0OiBleHRyYU9wdGlvbnMuaW5zZXJ0QXQgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3R5bGUuc3R5bGVTaGVldCkgeyAvLyBmb3IgSUU4IGFuZCBiZWxvd1xuICAgICAgICAgICAgaW5zZXJ0U3R5bGVFbGVtZW50KHN0eWxlLCB7IGluc2VydEF0OiBleHRyYU9wdGlvbnMuaW5zZXJ0QXQgfSk7XG4gICAgICAgICAgICBzdHlsZS5zdHlsZVNoZWV0LmNzc1RleHQgPSBjc3NUZXh0O1xuICAgICAgICB9IGVsc2UgeyAvLyBmb3IgQ2hyb21lLCBGaXJlZm94LCBhbmQgU2FmYXJpXG4gICAgICAgICAgICBzdHlsZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjc3NUZXh0KSk7XG4gICAgICAgICAgICBpbnNlcnRTdHlsZUVsZW1lbnQoc3R5bGUsIHsgaW5zZXJ0QXQ6IGV4dHJhT3B0aW9ucy5pbnNlcnRBdCB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCJ2YXIgbXVybXVyMyA9IHJlcXVpcmUoXCIuL211cm11cmhhc2gzX2djLmpzXCIpXG52YXIgbXVybXVyMiA9IHJlcXVpcmUoXCIuL211cm11cmhhc2gyX2djLmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gbXVybXVyM1xubW9kdWxlLmV4cG9ydHMubXVybXVyMyA9IG11cm11cjNcbm1vZHVsZS5leHBvcnRzLm11cm11cjIgPSBtdXJtdXIyXG4iLCIvKipcbiAqIEpTIEltcGxlbWVudGF0aW9uIG9mIE11cm11ckhhc2gyXG4gKiBcbiAqIEBhdXRob3IgPGEgaHJlZj1cIm1haWx0bzpnYXJ5LmNvdXJ0QGdtYWlsLmNvbVwiPkdhcnkgQ291cnQ8L2E+XG4gKiBAc2VlIGh0dHA6Ly9naXRodWIuY29tL2dhcnljb3VydC9tdXJtdXJoYXNoLWpzXG4gKiBAYXV0aG9yIDxhIGhyZWY9XCJtYWlsdG86YWFwcGxlYnlAZ21haWwuY29tXCI+QXVzdGluIEFwcGxlYnk8L2E+XG4gKiBAc2VlIGh0dHA6Ly9zaXRlcy5nb29nbGUuY29tL3NpdGUvbXVybXVyaGFzaC9cbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IHN0ciBBU0NJSSBvbmx5XG4gKiBAcGFyYW0ge251bWJlcn0gc2VlZCBQb3NpdGl2ZSBpbnRlZ2VyIG9ubHlcbiAqIEByZXR1cm4ge251bWJlcn0gMzItYml0IHBvc2l0aXZlIGludGVnZXIgaGFzaFxuICovXG5cbmZ1bmN0aW9uIG11cm11cmhhc2gyXzMyX2djKHN0ciwgc2VlZCkge1xuICB2YXJcbiAgICBsID0gc3RyLmxlbmd0aCxcbiAgICBoID0gc2VlZCBeIGwsXG4gICAgaSA9IDAsXG4gICAgaztcbiAgXG4gIHdoaWxlIChsID49IDQpIHtcbiAgXHRrID0gXG4gIFx0ICAoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhmZikpIHxcbiAgXHQgICgoc3RyLmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDgpIHxcbiAgXHQgICgoc3RyLmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDE2KSB8XG4gIFx0ICAoKHN0ci5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCAyNCk7XG4gICAgXG4gICAgayA9ICgoKGsgJiAweGZmZmYpICogMHg1YmQxZTk5NSkgKyAoKCgoayA+Pj4gMTYpICogMHg1YmQxZTk5NSkgJiAweGZmZmYpIDw8IDE2KSk7XG4gICAgayBePSBrID4+PiAyNDtcbiAgICBrID0gKCgoayAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChrID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKTtcblxuXHRoID0gKCgoaCAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChoID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKSBeIGs7XG5cbiAgICBsIC09IDQ7XG4gICAgKytpO1xuICB9XG4gIFxuICBzd2l0Y2ggKGwpIHtcbiAgY2FzZSAzOiBoIF49IChzdHIuY2hhckNvZGVBdChpICsgMikgJiAweGZmKSA8PCAxNjtcbiAgY2FzZSAyOiBoIF49IChzdHIuY2hhckNvZGVBdChpICsgMSkgJiAweGZmKSA8PCA4O1xuICBjYXNlIDE6IGggXj0gKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhmZik7XG4gICAgICAgICAgaCA9ICgoKGggJiAweGZmZmYpICogMHg1YmQxZTk5NSkgKyAoKCgoaCA+Pj4gMTYpICogMHg1YmQxZTk5NSkgJiAweGZmZmYpIDw8IDE2KSk7XG4gIH1cblxuICBoIF49IGggPj4+IDEzO1xuICBoID0gKCgoaCAmIDB4ZmZmZikgKiAweDViZDFlOTk1KSArICgoKChoID4+PiAxNikgKiAweDViZDFlOTk1KSAmIDB4ZmZmZikgPDwgMTYpKTtcbiAgaCBePSBoID4+PiAxNTtcblxuICByZXR1cm4gaCA+Pj4gMDtcbn1cblxuaWYodHlwZW9mIG1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gbXVybXVyaGFzaDJfMzJfZ2Ncbn1cbiIsIi8qKlxuICogSlMgSW1wbGVtZW50YXRpb24gb2YgTXVybXVySGFzaDMgKHIxMzYpIChhcyBvZiBNYXkgMjAsIDIwMTEpXG4gKiBcbiAqIEBhdXRob3IgPGEgaHJlZj1cIm1haWx0bzpnYXJ5LmNvdXJ0QGdtYWlsLmNvbVwiPkdhcnkgQ291cnQ8L2E+XG4gKiBAc2VlIGh0dHA6Ly9naXRodWIuY29tL2dhcnljb3VydC9tdXJtdXJoYXNoLWpzXG4gKiBAYXV0aG9yIDxhIGhyZWY9XCJtYWlsdG86YWFwcGxlYnlAZ21haWwuY29tXCI+QXVzdGluIEFwcGxlYnk8L2E+XG4gKiBAc2VlIGh0dHA6Ly9zaXRlcy5nb29nbGUuY29tL3NpdGUvbXVybXVyaGFzaC9cbiAqIFxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBBU0NJSSBvbmx5XG4gKiBAcGFyYW0ge251bWJlcn0gc2VlZCBQb3NpdGl2ZSBpbnRlZ2VyIG9ubHlcbiAqIEByZXR1cm4ge251bWJlcn0gMzItYml0IHBvc2l0aXZlIGludGVnZXIgaGFzaCBcbiAqL1xuXG5mdW5jdGlvbiBtdXJtdXJoYXNoM18zMl9nYyhrZXksIHNlZWQpIHtcblx0dmFyIHJlbWFpbmRlciwgYnl0ZXMsIGgxLCBoMWIsIGMxLCBjMWIsIGMyLCBjMmIsIGsxLCBpO1xuXHRcblx0cmVtYWluZGVyID0ga2V5Lmxlbmd0aCAmIDM7IC8vIGtleS5sZW5ndGggJSA0XG5cdGJ5dGVzID0ga2V5Lmxlbmd0aCAtIHJlbWFpbmRlcjtcblx0aDEgPSBzZWVkO1xuXHRjMSA9IDB4Y2M5ZTJkNTE7XG5cdGMyID0gMHgxYjg3MzU5Mztcblx0aSA9IDA7XG5cdFxuXHR3aGlsZSAoaSA8IGJ5dGVzKSB7XG5cdCAgXHRrMSA9IFxuXHQgIFx0ICAoKGtleS5jaGFyQ29kZUF0KGkpICYgMHhmZikpIHxcblx0ICBcdCAgKChrZXkuY2hhckNvZGVBdCgrK2kpICYgMHhmZikgPDwgOCkgfFxuXHQgIFx0ICAoKGtleS5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCAxNikgfFxuXHQgIFx0ICAoKGtleS5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCAyNCk7XG5cdFx0KytpO1xuXHRcdFxuXHRcdGsxID0gKCgoKGsxICYgMHhmZmZmKSAqIGMxKSArICgoKChrMSA+Pj4gMTYpICogYzEpICYgMHhmZmZmKSA8PCAxNikpKSAmIDB4ZmZmZmZmZmY7XG5cdFx0azEgPSAoazEgPDwgMTUpIHwgKGsxID4+PiAxNyk7XG5cdFx0azEgPSAoKCgoazEgJiAweGZmZmYpICogYzIpICsgKCgoKGsxID4+PiAxNikgKiBjMikgJiAweGZmZmYpIDw8IDE2KSkpICYgMHhmZmZmZmZmZjtcblxuXHRcdGgxIF49IGsxO1xuICAgICAgICBoMSA9IChoMSA8PCAxMykgfCAoaDEgPj4+IDE5KTtcblx0XHRoMWIgPSAoKCgoaDEgJiAweGZmZmYpICogNSkgKyAoKCgoaDEgPj4+IDE2KSAqIDUpICYgMHhmZmZmKSA8PCAxNikpKSAmIDB4ZmZmZmZmZmY7XG5cdFx0aDEgPSAoKChoMWIgJiAweGZmZmYpICsgMHg2YjY0KSArICgoKChoMWIgPj4+IDE2KSArIDB4ZTY1NCkgJiAweGZmZmYpIDw8IDE2KSk7XG5cdH1cblx0XG5cdGsxID0gMDtcblx0XG5cdHN3aXRjaCAocmVtYWluZGVyKSB7XG5cdFx0Y2FzZSAzOiBrMSBePSAoa2V5LmNoYXJDb2RlQXQoaSArIDIpICYgMHhmZikgPDwgMTY7XG5cdFx0Y2FzZSAyOiBrMSBePSAoa2V5LmNoYXJDb2RlQXQoaSArIDEpICYgMHhmZikgPDwgODtcblx0XHRjYXNlIDE6IGsxIF49IChrZXkuY2hhckNvZGVBdChpKSAmIDB4ZmYpO1xuXHRcdFxuXHRcdGsxID0gKCgoazEgJiAweGZmZmYpICogYzEpICsgKCgoKGsxID4+PiAxNikgKiBjMSkgJiAweGZmZmYpIDw8IDE2KSkgJiAweGZmZmZmZmZmO1xuXHRcdGsxID0gKGsxIDw8IDE1KSB8IChrMSA+Pj4gMTcpO1xuXHRcdGsxID0gKCgoazEgJiAweGZmZmYpICogYzIpICsgKCgoKGsxID4+PiAxNikgKiBjMikgJiAweGZmZmYpIDw8IDE2KSkgJiAweGZmZmZmZmZmO1xuXHRcdGgxIF49IGsxO1xuXHR9XG5cdFxuXHRoMSBePSBrZXkubGVuZ3RoO1xuXG5cdGgxIF49IGgxID4+PiAxNjtcblx0aDEgPSAoKChoMSAmIDB4ZmZmZikgKiAweDg1ZWJjYTZiKSArICgoKChoMSA+Pj4gMTYpICogMHg4NWViY2E2YikgJiAweGZmZmYpIDw8IDE2KSkgJiAweGZmZmZmZmZmO1xuXHRoMSBePSBoMSA+Pj4gMTM7XG5cdGgxID0gKCgoKGgxICYgMHhmZmZmKSAqIDB4YzJiMmFlMzUpICsgKCgoKGgxID4+PiAxNikgKiAweGMyYjJhZTM1KSAmIDB4ZmZmZikgPDwgMTYpKSkgJiAweGZmZmZmZmZmO1xuXHRoMSBePSBoMSA+Pj4gMTY7XG5cblx0cmV0dXJuIGgxID4+PiAwO1xufVxuXG5pZih0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gbXVybXVyaGFzaDNfMzJfZ2Ncbn0iLCIvKipcclxuICogVHJhbnNmb3JtIHRoZSBmaWx0ZXIgaW5wdXQgaW50byBhIFJlZ0V4cCwgdG8gbGV0IHRoZSB1c2VyIGhhdmUgYSBwb3dlcmZ1bGwgd2F5IHRvIGZpbHRlciBpbiB0aGUgdGFibGUuXHJcbiAqIE9ubHkgcm93cyB3aGVyZSB0aGUgdGVzdGVkIHZhbHVlIG1hdGNoZXMgdGhlIFJlZ0V4cCwgZ2V0IGRpc3BsYXllZC4gXHJcbiAqIEFkZGl0aW9uYWxseSB5b3UgY2FuIHByZXBlbmQgdGhyZWUgZXhjbGFtYXRpb24gbWFya3MgKCchISEnKSB0byBuZWdhdGUgdGhlIFJlZ0V4cCwgc28gdGhhdCBvbmx5IHJvd3MgdGhhdFxyXG4gKiBkb24ndCBtYXRjaCB0aGUgUmVnRXhwIGFyZSBkaXNwbGF5ZWQuIFRoaXMgaXMgdGhlIGRlZmF1bHQgZmlsdGVyIGZ1bmN0aW9uLlxyXG4gKiBUaGlzIGZ1bmN0aW9uIGNhbiBiZSByZXBsYWNlZCBieSBzdXBwbHlpbmcgeW91ciBvd24gZnVuY3Rpb25zIHRvIFRhYmxlQ29tcG9uZW50LmZpbHRlck9wZXJhdGlvbnMuXHJcbiAqIFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsdGVySW5wdXQgdGhlIHZhbHVlIG9mIHRoZSBmaWx0ZXIgdGV4dCBpbnB1dCBmaWVsZC5cclxuICogQHBhcmFtIHtzdHJpbmd9IHRlc3RWYWx1ZSB0aGUgdGFibGUgdmFsdWUgdG8gdmFsaWRhdGUgYWdhaW5zdC5cclxuICovXHJcbmZ1bmN0aW9uIHJlZ2V4RmlsdGVyKG5lZ2F0ZSwgZmlsdGVySW5wdXQsIHRlc3RWYWx1ZSl7XHJcbiAgLy8gbGV0IG5lZ2F0ZSA9IGZpbHRlcklucHV0LnN1YnN0cmluZygwLCAzKSA9PT0gJyEhISc7XHJcbiAgLy8gZmlsdGVySW5wdXQgPSBuZWdhdGUgPyBmaWx0ZXJJbnB1dC5zdWJzdHJpbmcoMykgOiBmaWx0ZXJJbnB1dDtcclxuICBsZXQgcmVzdWx0ID0gZmFsc2U7XHJcbiAgaWYodGVzdFZhbHVlICE9IHVuZGVmaW5lZCl7XHJcbiAgICBsZXQgbWF0Y2hlcyA9IHRlc3RWYWx1ZS50b1N0cmluZygpLm1hdGNoKG5ldyBSZWdFeHAoZmlsdGVySW5wdXQsICdpJykpO1xyXG4gICAgcmVzdWx0ID0gQm9vbGVhbihtYXRjaGVzKSAmJiBtYXRjaGVzLmxlbmd0aCA+IDA7XHJcbiAgfVxyXG4gIHJldHVybiBuZWdhdGUgPyAhcmVzdWx0IDogcmVzdWx0O1xyXG59XHJcbiAgXHJcbi8qKlxyXG4gKiBUZXN0IHRoZSBmaWx0ZXIgaW5wdXQgc3RyaW5nIHdpdGggaW5jbHVkZXMgKGNhc2UgaXMgaWdub3JlZCkgYWdhaW5zdCB0aGUgdGFibGUgdmFsdWUuXHJcbiAqIE9ubHkgcm93cyB3aGVyZSB0aGUgZmlsdGVyIGlucHV0IGlzIGEgc3Vic3RyaW5nIG9mIHRoZSB0ZXN0ZWQgdmFsdWUuXHJcbiAqIEFkZGl0aW9uYWxseSB5b3UgY2FuIHByZXBlbmQgdGhyZWUgZXhjbGFtYXRpb24gbWFya3MgKCchISEnKSB0byBuZWdhdGUgdGhlIG91dGNvbWUsIFxyXG4gKiBzbyB0aGF0IG9ubHkgcm93cyB0aGF0IGFyZSBub3QgaW5jbHVkZWQgaW4gdGhlIHRhYmxlIHZhbHVlIGFyZSBkaXNwbGF5ZWQuXHJcbiAqIFRoaXMgZnVuY3Rpb24gY2FuIHJlcGxhY2UgcmVnZXhGaWx0ZXIgYnkgc3VwcGx5aW5nIGl0IHRvIFRhYmxlQ29tcG9uZW50LmZpbHRlck9wZXJhdGlvbnMgb3Igb3ZlcndyaXRpbmdcclxuICogcmVnZXhGaWx0ZXIgYmVmb3JlIHVzZS5cclxuICogXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBmaWx0ZXJJbnB1dCB0aGUgdmFsdWUgb2YgdGhlIGZpbHRlciB0ZXh0IGlucHV0IGZpZWxkLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gdGVzdFZhbHVlIHRoZSB0YWJsZSB2YWx1ZSB0byB2YWxpZGF0ZSBhZ2FpbnN0LlxyXG4gKi9cclxuZnVuY3Rpb24gdGV4dEZpbHRlcihuZWdhdGUsIGZpbHRlcklucHV0LCB0ZXN0VmFsdWUpe1xyXG4gIC8vIGxldCBuZWdhdGUgPSBmaWx0ZXJJbnB1dC5zdWJzdHJpbmcoMCwgMykgPT09ICchISEnO1xyXG4gIC8vIGZpbHRlcklucHV0ID0gbmVnYXRlID8gZmlsdGVySW5wdXQuc3Vic3RyaW5nKDMpIDogZmlsdGVySW5wdXQ7XHJcbiAgbGV0IHJlc3VsdCA9IGZhbHNlO1xyXG4gIGlmKHRlc3RWYWx1ZSAhPSB1bmRlZmluZWQpe1xyXG4gICAgcmVzdWx0ID0gdGVzdFZhbHVlLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKS5pbmNsdWRlcyhmaWx0ZXJJbnB1dC50b1VwcGVyQ2FzZSgpKTtcclxuICB9XHJcbiAgcmV0dXJuIG5lZ2F0ZSA/ICFyZXN1bHQgOiByZXN1bHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbXBhcmVGaWx0ZXIob3BlcmF0aW9uLCBmaWx0ZXJJbnB1dCwgdGVzdFZhbHVlKXtcclxuICBsZXQgcmVzdWx0ID0gZmFsc2U7XHJcbiAgaWYodGVzdFZhbHVlICE9IHVuZGVmaW5lZCl7XHJcbiAgICB0cnl7XHJcbiAgICAgIHJlc3VsdCA9IG9wZXJhdGlvbihOdW1iZXIucGFyc2VGbG9hdChmaWx0ZXJJbnB1dCksIE51bWJlci5wYXJzZUZsb2F0KHRlc3RWYWx1ZSkpO1xyXG4gICAgfSBjYXRjaCAoZXJyKXtcclxuICAgICAgcmVzdWx0ID0gb3BlcmF0aW9uKGZpbHRlcklucHV0LnRvU3RyaW5nKCksIHRlc3RWYWx1ZS50b1N0cmluZygpKTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7cmVnZXhGaWx0ZXIsIHRleHRGaWx0ZXIsIGNvbXBhcmVGaWx0ZXJ9OyIsImZ1bmN0aW9uIGdldEZyYW1lU3RhcnRFbmQoY3VycmVudFBhZ2UsIHRvdGFsUGFnZXMpIHtcclxuICAgIGxldCBzdGFydCA9IGN1cnJlbnRQYWdlIC0gMjtcclxuICAgIGxldCBlbmQgPSBjdXJyZW50UGFnZSArIDI7XHJcblxyXG4gICAgaWYgKGN1cnJlbnRQYWdlID49IHRvdGFsUGFnZXMgLSAxKSB7XHJcbiAgICAgICAgZW5kID0gdG90YWxQYWdlcztcclxuICAgICAgICBzdGFydCA9IHRvdGFsUGFnZXMgPCA1ID8gMSA6IHRvdGFsUGFnZXMgLSA0O1xyXG4gICAgfSBlbHNlIGlmIChjdXJyZW50UGFnZSA8PSAyKSB7XHJcbiAgICAgICAgZW5kID0gdG90YWxQYWdlcyA8IDUgPyB0b3RhbFBhZ2VzIDogNTtcclxuICAgICAgICBzdGFydCA9IDE7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHsgc3RhcnQ6IHN0YXJ0LCBlbmQ6IGVuZCB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjaGFuZ2VQYWdlVG8odGFibGUsIHRhcmdldFBhZ2UpIHtcclxuICAgIHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPSB0YXJnZXRQYWdlO1xyXG4gICAgdGFibGUuc2VyaWFsaXplTGlua09wdGlvbnMoKTtcclxuICAgIHRhYmxlLnJlZHJhd0RhdGEoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb25QYWdlQ2hhbmdlS2V5KHRhYmxlLCBldmVudCkge1xyXG4gICAgaWYgKGV2ZW50LmtleUNvZGUgPT0gMzcpIHtcclxuICAgICAgICBjaGFuZ2VQYWdlVG8odGFibGUsIHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPiAxID8gdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSAtIDEgOiAxKVxyXG4gICAgICAgICAgICAvL3RhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPSB0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlID4gMSA/IHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgLSAxIDogMTtcclxuICAgICAgICAgICAgLy90YWJsZS5yZWRyYXdEYXRhKCk7XHJcbiAgICB9IGVsc2UgaWYgKGV2ZW50LmtleUNvZGUgPT0gMzkpIHtcclxuICAgICAgICBjaGFuZ2VQYWdlVG8odGFibGUsIHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgPCB0YWJsZS5wYWdpbmF0aW9uLnRvdGFsUGFnZXMgPyB0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlICsgMSA6IHRhYmxlLnBhZ2luYXRpb24udG90YWxQYWdlcyk7XHJcbiAgICAgICAgLy90YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlID0gdGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSA8IHRhYmxlLnBhZ2luYXRpb24udG90YWxQYWdlcyA/IHRhYmxlLnBhZ2luYXRpb24uY3VycmVudFBhZ2UgKyAxIDogdGFibGUucGFnaW5hdGlvbi50b3RhbFBhZ2VzO1xyXG4gICAgICAgIC8vdGFibGUucmVkcmF3RGF0YSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjbGlja0hhbmRsZXJEb2N1bWVudCh0YWJsZSwgZXZlbnQpIHtcclxuICAgIGxldCBrZXlDaGFuZ2VMaXN0ZW5lciA9IG9uUGFnZUNoYW5nZUtleS5iaW5kKG51bGwsIHRhYmxlKTtcclxuXHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXl1cCcsIGtleUNoYW5nZUxpc3RlbmVyKTtcclxuXHJcbiAgICBpZiAodGFibGUuZWxlbWVudHMucGFnZUNob29zZXIgPT0gZXZlbnQudGFyZ2V0IHx8IHRhYmxlLmVsZW1lbnRzLnBhZ2VDaG9vc2VyID09IGV2ZW50LnRhcmdldC5wYXJlbnROb2RlKSB7XHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBrZXlDaGFuZ2VMaXN0ZW5lcik7XHJcbiAgICAgICAgdGFibGUuZWxlbWVudHMucGFnZUNob29zZXIuY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKHRhYmxlICYmIHRhYmxlLmVsZW1lbnRzLnBhZ2VDaG9vc2VyKSB0YWJsZS5lbGVtZW50cy5wYWdlQ2hvb3Nlci5jbGFzc0xpc3QucmVtb3ZlKCdzZWxlY3RlZCcpO1xyXG4gICAgfVxyXG59XHJcblxyXG5sZXQgY2xpY2tIYW5kbGVyQm91bmRDYWxsID0gdW5kZWZpbmVkO1xyXG5cclxuZnVuY3Rpb24gYWRkS2V5SGFuZGxlclRvRG9jdW1lbnQodGFibGUpIHtcclxuICAgIGlmICghY2xpY2tIYW5kbGVyQm91bmRDYWxsKSBjbGlja0hhbmRsZXJCb3VuZENhbGwgPSBjbGlja0hhbmRsZXJEb2N1bWVudC5iaW5kKG51bGwsIHRhYmxlKTtcclxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2xpY2tIYW5kbGVyQm91bmRDYWxsKTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2xpY2tIYW5kbGVyQm91bmRDYWxsKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlUGFnZUNob29zZXIodGFibGUsIGRhdGEpIHtcclxuICAgIGxldCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICBsZXQgY3VycmVudFBhZ2UgPSB0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlO1xyXG4gICAgbGV0IHRvdGFsUGFnZXMgPSB0YWJsZS5wYWdpbmF0aW9uLnRvdGFsUGFnZXM7XHJcbiAgICBpZiAodGFibGUucGFnaW5hdGlvbi5hY3RpdmUpIHtcclxuICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ3BhZ2UtY2hvb3NlcicsICd3Z3QtcGFnaW5hdGlvbicpO1xyXG4gICAgICAgIGxldCBmcm9udF9kaXNhYmxlZCA9IGN1cnJlbnRQYWdlID09IDFcclxuICAgICAgICBsZXQgYmFja19kaXNhYmxlZCA9IGN1cnJlbnRQYWdlID09IHRvdGFsUGFnZXM7XHJcbiAgICAgICAgZWxlbWVudC5hcHBlbmQoY3JlYXRlUGFnZUNob29zZXJDaGlsZCgnPDwnLCB0YWJsZSwgMSwgZmFsc2UsIGZyb250X2Rpc2FibGVkKSk7XHJcbiAgICAgICAgZWxlbWVudC5hcHBlbmQoY3JlYXRlUGFnZUNob29zZXJDaGlsZCgnPCcsIHRhYmxlLCBjdXJyZW50UGFnZSAtIDEsIGZhbHNlLCBmcm9udF9kaXNhYmxlZCkpO1xyXG4gICAgICAgIGxldCB7IHN0YXJ0LCBlbmQgfSA9IGdldEZyYW1lU3RhcnRFbmQoY3VycmVudFBhZ2UsIHRvdGFsUGFnZXMpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8PSBlbmQ7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFBhZ2UgPT0gaSkge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmQoY3JlYXRlUGFnZUNob29zZXJDaGlsZChpLnRvU3RyaW5nKCksIHRhYmxlLCBpLCB0cnVlKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZChjcmVhdGVQYWdlQ2hvb3NlckNoaWxkKGkudG9TdHJpbmcoKSwgdGFibGUsIGkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbGVtZW50LmFwcGVuZChjcmVhdGVQYWdlQ2hvb3NlckNoaWxkKCc+JywgdGFibGUsIGN1cnJlbnRQYWdlICsgMSwgZmFsc2UsIGJhY2tfZGlzYWJsZWQpKTtcclxuICAgICAgICBlbGVtZW50LmFwcGVuZChjcmVhdGVQYWdlQ2hvb3NlckNoaWxkKCc+PicsIHRhYmxlLCB0b3RhbFBhZ2VzLCBmYWxzZSwgYmFja19kaXNhYmxlZCkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGVsZW1lbnQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVBhZ2VDaG9vc2VyQ2hpbGQoY29udGVudCwgdGFibGUsIHRhcmdldFBhZ2UsIGlzQ3VycmVudCwgaXNEaXNhYmxlZCkge1xyXG4gICAgbGV0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIGVsZW1lbnQuaW5uZXJIVE1MID0gY29udGVudDtcclxuICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgncGFnZS1jaGFuZ2UnLCAnd2d0LXBhZ2luYXRpb24nKTtcclxuICAgIGlmIChpc0N1cnJlbnQpIHtcclxuICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZS1wYWdlJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChpc0Rpc2FibGVkKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgncGFnZS1jaGFuZ2UtZGlzYWJsZWQnKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjaGFuZ2VQYWdlVG8odGFibGUsIHRhcmdldFBhZ2UpXHJcbiAgICAgICAgICAgICAgICAgICAgLy90YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlID0gdGFyZ2V0UGFnZTtcclxuICAgICAgICAgICAgICAgICAgICAvL3RhYmxlLnJlZHJhd0RhdGEoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGVsZW1lbnQ7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgZ2V0RnJhbWVTdGFydEVuZCxcclxuICAgIGNyZWF0ZVBhZ2VDaG9vc2VyLFxyXG4gICAgY3JlYXRlUGFnZUNob29zZXJDaGlsZCxcclxuICAgIGFkZEtleUhhbmRsZXJUb0RvY3VtZW50LFxyXG4gICAgY2hhbmdlUGFnZVRvLFxyXG59IiwidmFyIGNzcyA9IFwiLyogYm9keSB7XFxyXFxuICBmb250OiBhcmlhbCwgc2Fucy1zZXJpZjtcXHJcXG59ICovXFxuLndndC1ncmlkLWNvbnRhaW5lciB7XFxuICBkaXNwbGF5OiBncmlkO1xcbiAgcG9zaXRpb246IHN0YXRpYztcXG4gIG1heC13aWR0aDogbWluLWNvbnRlbnQ7XFxuICBtYXgtaGVpZ2h0OiA1MDBweDtcXG4gIG92ZXJmbG93LXk6IHNjcm9sbDtcXG4gIGJhY2tncm91bmQ6IGxpZ2h0Z3JheTtcXG4gIC8qIGdyaWQtZ2FwOiAxcHg7ICovXFxuICAvKiBncmlkLXJvdy1nYXA6IDJweDsgKi9cXG4gIGdyaWQtY29sdW1uLWdhcDogMnB4O1xcbiAgYm9yZGVyOiAxcHggc29saWQgbGlnaHRncmF5O1xcbn1cXG4uaGVhZGVyLWNvbC10b29sdGlwIHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgYm9yZGVyOiAxcHggc29saWQgbGlnaHRncmF5O1xcbiAgYm9yZGVyLXJpZ2h0OiAxcHggZG90dGVkIGxpZ2h0Z3JheTtcXG4gIHBvaW50ZXItZXZlbnRzOiBub25lO1xcbiAgei1pbmRleDogOTk7XFxuICB2aXNpYmlsaXR5OiBoaWRkZW47XFxuICBtYXJnaW46IC0xcHg7XFxufVxcbi5oZWFkZXItY29sLXRvb2x0aXAudmlzaWJsZSB7XFxuICB2aXNpYmlsaXR5OiB2aXNpYmxlO1xcbn1cXG4ud2d0LWhlYWRlciB7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG4gIHBvc2l0aW9uOiBzdGlja3k7XFxuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgdG9wOiAwcHg7XFxuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgbGlnaHRncmF5O1xcbiAgb3ZlcmZsb3cteTogaGlkZGVuO1xcbn1cXG4ud2d0LWhlYWRlcj5kaXYuYXJyb3cge1xcbiAgLyogdmlzaWJpbGl0eTogaGlkZGVuOyAqL1xcbiAgY29sb3I6IGxpZ2h0Z3JheTtcXG4gIHdpZHRoOiAxZW07XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG4gIHRvcDogMHB4O1xcbiAgYm90dG9tOiAwcHg7XFxuICByaWdodDogMHB4O1xcbiAgcGFkZGluZy1yaWdodDogNXB4O1xcbiAgbWFyZ2luLXRvcDogYXV0bztcXG4gIG1hcmdpbi1ib3R0b206IGF1dG87XFxuICBmb250LWZhbWlseTogbW9ub3NwYWNlO1xcbiAgZm9udC1zaXplOiBsYXJnZTtcXG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7XFxuICBwYWRkaW5nLXRvcDogNXB4O1xcbiAgcGFkZGluZy1ib3R0b206IDVweDtcXG4gIGN1cnNvcjogcG9pbnRlcjtcXG4gIC1tb3otdXNlci1zZWxlY3Q6IHRleHQ7XFxuICBiYWNrZ3JvdW5kOiB3aGl0ZTtcXG4gIHRleHQtYWxpZ246IGNlbnRlcjtcXG4gIHRyYW5zZm9ybTogc2NhbGUoMSwgMil0cmFuc2xhdGUoMjAlLCAxMyUpO1xcbn1cXG4ud2d0LWNvbC1oZWFkZXItY29udGFpbmVyIHtcXG4gIHdpZHRoOiAxZW07XFxuICBvdmVyZmxvdy14OiB2aXNpYmxlO1xcbn1cXG4ud2d0LWZpbHRlcl9jZWxsIHtcXG4gIHBvc2l0aW9uOiBzdGlja3k7XFxuICB0b3A6IDBweDtcXG4gIGJhY2tncm91bmQ6IHdoaXRlO1xcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgaGVpZ2h0OiAyZW07XFxuICB0ZXh0LWFsaWduOiBjZW50ZXI7XFxuICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbiAgZm9udC1zaXplOiAxcmVtO1xcbiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIGxpZ2h0Z3JheTtcXG4gIGJveC1zaGFkb3c6IGluc2V0IDFweCAxcHggNXB4IDBweCBsaWdodGdyZXk7XFxuICBwYWRkaW5nLXRvcDogNXB4O1xcbiAgcGFkZGluZy1ib3R0b206IDVweDtcXG4gIG1hcmdpbi10b3A6IGF1dG87XFxuICBtYXJnaW4tYm90dG9tOiBhdXRvO1xcbn1cXG4uZmlsdGVyX2lucHV0IHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIHRvcDogMHB4O1xcbiAgbGVmdDogMHB4O1xcbiAgYm90dG9tOiAwcHg7XFxuICByaWdodDogMHB4O1xcbiAgbWFyZ2luLXRvcDogYXV0bztcXG4gIG1hcmdpbi1ib3R0b206IGF1dG87XFxuICBwYWRkaW5nLXRvcDogNXB4O1xcbiAgcGFkZGluZy1ib3R0b206IDVweDtcXG59XFxuLmZpbHRlcl9uZWdhdG9yIHtcXG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbiAgdG9wOiAwcHg7XFxuICBib3R0b206IDBweDtcXG4gIGxlZnQ6IDBweDtcXG4gIHBhZGRpbmctbGVmdDogNXB4O1xcbiAgbWFyZ2luLXRvcDogYXV0bztcXG4gIG1hcmdpbi1ib3R0b206IGF1dG87XFxuICBmb250LWZhbWlseTogbW9ub3NwYWNlO1xcbiAgZm9udC1zaXplOiAxZW07XFxuICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlO1xcbiAgcGFkZGluZy10b3A6IDVweDtcXG4gIHBhZGRpbmctYm90dG9tOiA1cHg7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxufVxcbi53Z3QtY2VsbCB7XFxuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgZm9udC1zaXplOiAxcmVtO1xcbiAgcGFkZGluZy1sZWZ0OiAyMHB4O1xcbiAgcGFkZGluZy1yaWdodDogMjBweDtcXG4gIHBhZGRpbmctdG9wOiAxMHB4O1xcbiAgcGFkZGluZy1ib3R0b206IDEwcHg7XFxuICBiYWNrZ3JvdW5kOiB3aGl0ZTtcXG4gIC8qIGJvcmRlcjogMnB4IHNvbGlkIGxpZ2h0Z3JheTsgKi9cXG4gIG92ZXJmbG93LXg6IGhpZGRlbjtcXG59XFxuLndndC1kYXRhLWNlbGwge1xcbiAgbWF4LXdpZHRoOiA1MDBweDtcXG59XFxuLndndC1oZWFkZXIud2d0LWNlbGwge1xcbiAgcGFkZGluZy1yaWdodDogMzBweDtcXG59XFxuLndndC16ZWJyYV8xIHtcXG4gIGJhY2tncm91bmQ6IHdoaXRlO1xcbn1cXG4ud2d0LXplYnJhXzAge1xcbiAgYmFja2dyb3VuZDogcmdiKDIzMCwgMjMwLCAyMzApO1xcbn1cXG4ud2d0LWZvb3RlciB7XFxuICBkaXNwbGF5OiBncmlkO1xcbiAgcG9zaXRpb246IHN0aWNreTtcXG4gIGJvdHRvbTogMHB4O1xcbiAgYmFja2dyb3VuZDogd2hpdGU7XFxuICBib3JkZXItdG9wOiAxcHggc29saWQgbGlnaHRncmF5O1xcbiAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiAxZnI7XFxuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdCg0LCBmaXQtY29udGVudCgzMDBweCkpIDFmcjtcXG59XFxuLmZvb3Rlci1idXR0b24ge1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgYm9yZGVyOiAxcHggc29saWQgcmdiYSgyNywgMzEsIDM1LCAuMik7XFxuICAvKiBib3JkZXItcmFkaXVzOiAuMjVlbTsgKi9cXG4gIHdpZHRoOiBtYXgtY29udGVudDtcXG4gIG92ZXJmbG93OiB2aXNpYmxlO1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogI2VmZjNmNjtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCgtMTgwZGVnLCAjZmFmYmZjLCBlZmYzZjYsIDkwJSk7XFxuICBiYWNrZ3JvdW5kLXJlcGVhdDogcmVwZWF0LXg7XFxuICBiYWNrZ3JvdW5kLXBvc2l0aW9uOiAtMXB4IC0xcHg7XFxuICBiYWNrZ3JvdW5kLXNpemU6IDExMCUgMTEwJTtcXG4gIC13ZWJraXQtYXBwZWFyYW5jZTogbm9uZTtcXG4gIC1tb3otYXBwZWFyYW5jZTogbm9uZTtcXG4gIGFwcGVhcmFuY2U6IG5vbmU7XFxuICB1c2VyLXNlbGVjdDogbm9uZTtcXG59XFxuLmZvb3Rlci1idXR0b246aG92ZXIge1xcbiAgYm94LXNoYWRvdzogaW5zZXQgMHB4IDBweCAyMHB4IDJweCByZ2JhKDAsIDAsIDAsIDAuMik7XFxufVxcbi5mb290ZXItYnV0dG9uLWRvd246YWZ0ZXIge1xcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xcbiAgd2lkdGg6IDBweDtcXG4gIGhlaWdodDogMHB4O1xcbiAgdmVydGljYWwtYWxpZ246IC0ycHg7XFxuICBjb250ZW50OiBcXFwiXFxcIjtcXG4gIGJvcmRlcjogNHB4IHNvbGlkIHRyYW5zcGFyZW50O1xcbiAgYm9yZGVyLXRvcC1jb2xvcjogY3VycmVudGNvbG9yO1xcbn1cXG4uY29sdW1uLWNob29zZXItbWVudS1jb250YWluZXIge1xcbiAgLyogcG9zaXRpb246IGFic29sdXRlOyAqL1xcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xcbiAgd2lkdGg6IDIwMHB4O1xcbiAgaGVpZ2h0OiBtaW4tY29udGVudDtcXG4gIC8qIHRvcDogMHB4OyAqL1xcbiAgLyogYm90dG9tOiAwcHg7ICovXFxuICBsZWZ0OiAwcHg7XFxuICAvKiByaWdodDogMHB4OyAqL1xcbiAgLyogYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLDAsMCwuNSk7ICovXFxuICB6LWluZGV4OiA5OTtcXG4gIHZpc2liaWxpdHk6IHZpc2libGU7XFxufVxcbi5jb2x1bW4tY2hvb3Nlci1tZW51IHtcXG4gIG1hcmdpbi10b3A6IGF1dG87XFxuICBtYXJnaW4tYm90dG9tOiBhdXRvO1xcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcXG4gIGNvbG9yOiBibGFjaztcXG4gIGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMTAwLCAxMDAsIDEwMCwgMC41KTtcXG4gIGJvcmRlci1yYWRpdXM6IDVweDtcXG4gIGxpc3Qtc3R5bGU6IG5vbmU7XFxuICBwYWRkaW5nLWxlZnQ6IDBweDtcXG4gIGJhY2tncm91bmQtY29sb3I6IGxpZ2h0Z3JheTtcXG4gIGJveC1zaGFkb3c6IDFweCAycHggMTBweCAycHggcmdiYSgwLCAwLCAwLCAwLjIpO1xcbn1cXG4uY29sdW1uLWNob29zZXItbWVudS1jb250YWluZXIuaGlkZGVuIHtcXG4gIHZpc2liaWxpdHk6IGhpZGRlbjtcXG4gIGhlaWdodDogMHB4O1xcbn1cXG4uY29sdW1uLWNob29zZXItaXRlbSB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTtcXG4gIC8qIGJvcmRlci1yYWRpdXM6IDVweDsgKi9cXG4gIG1hcmdpbi10b3A6IDFweDtcXG4gIHVzZXItc2VsZWN0OiBub25lO1xcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcXG59XFxuLmNvbHVtbi1jaG9vc2VyLWl0ZW06Zmlyc3QtY2hpbGQge1xcbiAgbWFyZ2luLXRvcDogMHB4O1xcbn1cXG4uY29sdW1uLWNob29zZXItaXRlbTpob3ZlciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBsaWdodGJsdWU7XFxuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbiAgYmFja2dyb3VuZC1jbGlwOiBwYWRkaW5nLWJveDtcXG4gIGJvcmRlci1yYWRpdXM6IDVweDtcXG59XFxuLmNvbHVtbi1jaG9vc2VyLWl0ZW0+bGFiZWwge1xcbiAgZGlzcGxheTogYmxvY2s7XFxuICBjdXJzb3I6IHBvaW50ZXI7XFxuICBwYWRkaW5nOiA1cHggMjBweCA1cHggNXB4O1xcbn1cXG4ucGFnZS1jaG9vc2VyIHtcXG4gIGRpc3BsYXk6IGdyaWQ7XFxuICBncmlkLXRlbXBsYXRlLXJvd3M6IGF1dG87XFxuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdCg5LCBhdXRvKTtcXG4gIGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7XFxuICBncmlkLWNvbHVtbjogLTE7XFxuICBib3JkZXItbGVmdDogbm9uZTtcXG4gIHBvc2l0aW9uOiBzdGlja3k7XFxuICByaWdodDogMHB4O1xcbn1cXG4ucGFnZS1jaG9vc2VyLnNlbGVjdGVkIHtcXG4gIGJvcmRlci1sZWZ0OiAxcHggZG90dGVkIGdyYXk7XFxufVxcbi5wYWdlLWNoYW5nZSB7XFxuICBtYXJnaW4tdG9wOiBhdXRvO1xcbiAgbWFyZ2luLWJvdHRvbTogYXV0bztcXG4gIHBhZGRpbmctbGVmdDogNXB4O1xcbiAgcGFkZGluZy1yaWdodDogNXB4O1xcbn1cXG4ucGFnZS1jaGFuZ2U6Zmlyc3QtY2hpbGQge1xcbiAgbWFyZ2luLXRvcDogYXV0byAhaW1wb3J0YW50O1xcbn1cXG4ucGFnZS1jaGFuZ2U6bm90KC5wYWdlLWNoYW5nZS1kaXNhYmxlZCkge1xcbiAgY3Vyc29yOiBwb2ludGVyO1xcbn1cXG4ucGFnZS1jaGFuZ2UtZGlzYWJsZWQge1xcbiAgY29sb3I6IGdyYXk7XFxufVxcbi5hY3RpdmUtcGFnZSB7XFxuICBmb250LXdlaWdodDogYm9sZDtcXG59XFxuLndndC1mb290ZXJfY2VsbCB7XFxuICBib3JkZXItcmlnaHQ6IDFweCBzb2xpZCBsaWdodGdyYXk7XFxuICB3aWR0aDogbWF4LWNvbnRlbnQ7XFxufVxcbkAtbW96LWRvY3VtZW50IHVybC1wcmVmaXgoKSAge1xcbiAgLndndC1ncmlkLWNvbnRhaW5lciBkaXY6bnRoLWxhc3QtY2hpbGQoMikud2d0LWRhdGEtY2VsbCB7XFxuICAgIGhlaWdodDogMjAwJTtcXG4gIH1cXG5cXG4gIC5maWx0ZXJfbmVnYXRvciB7XFxuICAgIGZvbnQtc2l6ZTogMWVtO1xcbiAgfVxcbn1cXG5cIjsgKHJlcXVpcmUoXCJicm93c2VyaWZ5LWNzc1wiKS5jcmVhdGVTdHlsZShjc3MsIHsgXCJocmVmXCI6IFwibm9kZV9tb2R1bGVzL3djLWdyaWQtdGFibGUvc3JjL3djLWdyaWQtdGFibGUuY3NzXCIgfSwgeyBcImluc2VydEF0XCI6IFwiYm90dG9tXCIgfSkpOyBtb2R1bGUuZXhwb3J0cyA9IGNzczsiLCIvLz8gRkVBVFVSRTogbWF5YmUgYWRkIHBvc3NpYmlsaXR5IGZvciBob3Jpem9udGFsIGhlYWRlciBlaXRoZXJcclxuLy8/IFRvcCAtPiBEb3duIC0gY3NzOiB7IHdyaXRpbmctbW9kZTogc2lkZXdheXMtcmwsIHRleHQtb3JpZW50YXRpb24gOiBzaWRld2F5cyB9IG9yXHJcbi8vPyBCb3R0b20gLT4gVXAgLSBjc3M6IHsgd3JpdGluZy1tb2RlOiBzaWRld2F5cy1sciwgdGV4dC1vcmllbnRhdGlvbiA6IHNpZGV3YXlzIH1cclxuXHJcblxyXG4vKipcclxuICogUHJvamVjdDogd2MtZ3JpZC10YWJsZVxyXG4gKiBSZXBvc2l0b3J5OiBodHRwczovL2dpdGh1Yi5jb20vUm9iZXJ0U2VpZGxlci93Yy1ncmlkLXRhYmxlXHJcbiAqIEF1dGhlcjogUm9iZXJ0IFNlaWRsZXJcclxuICogRW1haWw6IFJvYmVydC5TZWlkbGVyMUBnb29nbGVtYWlsLmNvbSBcclxuICogTGljZW5zZTogSVNDXHJcbiAqL1xyXG5cclxucmVxdWlyZSgnLi93Yy1ncmlkLXRhYmxlLmNzcycpO1xyXG5cclxuLy8gdGVzdCBleGNlcHRpb24gdHJhY2tlciB3aXRoIGFuIGFjdHVhbCBtb2R1bGUuXHJcbi8vVE9ETzogQ29tbWVudCBvdXQgYmVmb3JlIHBhY2thZ2luZ1xyXG5sZXQgYXBwbmFtZSA9ICd3Yy1ncmlkLXRhYmxlJztcclxuLy8gbGV0IHRyYWNrZXIgPSByZXF1aXJlKCcuLi8uLi9leGNlcHRpb24tdHJhY2tlci1zZXJ2ZXIvdGVzdC1jbGllbnQvdHJhY2tlci5qcycpXHJcbi8vICAgLlRyYWNrZXJcclxuLy8gICAuaW5qZWN0Q29uc29sZSgnaHR0cDovL2xvY2FsaG9zdDo1MjAwNS8nLCAnd2MtZ3JpZC10YWJsZScsIHRydWUsIHRydWUsIHRydWUpO1xyXG5cclxuXHJcbmNvbnN0IHsgcmVnZXhGaWx0ZXIsIHRleHRGaWx0ZXIsIGNvbXBhcmVGaWx0ZXIgfSA9IHJlcXVpcmUoJy4vZmlsdGVyLXV0aWxzLmpzJyk7XHJcbmNvbnN0IHsgY3JlYXRlUGFnZUNob29zZXIsIGFkZEtleUhhbmRsZXJUb0RvY3VtZW50IH0gPSByZXF1aXJlKCcuL3BhZ2luYXRpb24tdXRpbHMuanMnKTtcclxuY29uc3QgbXVybXVyID0gcmVxdWlyZShcIm11cm11cmhhc2gtanNcIik7XHJcblxyXG52YXIgdGFibGVDb3VudGVyID0gMDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBDbG9zdXJlLCBzbyB0aGF0IG9ubHkgZnVuY3Rpb25zIEkgd2FudCB0byBleHBvc2UgYXJlIGdldHRpbmcgZXhwb3NlZC5cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGRlZmluZVNldFByb3RvdHlwZUZ1bmN0aW9ucygpIHtcclxuICAgICAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgICAgICogQHBhcmFtIHtJdGVyYWJsZX0gYW4gaXRlcmFibGUsIHRoYXQgc2hvdWxkIGJlIHVuaW9uZWQgd2l0aCB0aGUgc3RhcnRpbmcgU2V0XHJcbiAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTZXQucHJvdG90eXBlLCAndW5pb24nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKGFub3RoZXJTZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgZWxlbWVudCBvZiBhbm90aGVyU2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3ROdW1iZXJSZWdleCA9IC9eKC17MCwxfVswLTldezEsM30oPzpbXFwufCxdezAsMX1bMC05XXszfSkqW1xcLnxcXCxdezAsMX1bMC05XSopXFxzezAsMX1cXEQqJC9pO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gZml4Q29sdW1uSGVhZGVyKHRhYmxlLCBjb2xfaGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5oZWFkZXIuZm9yRWFjaCgoY29sdW1uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbF9oZWFkZXIgPSB0YWJsZS5lbGVtZW50cy5oZWFkZXJbY29sdW1uXTtcclxuICAgICAgICAgICAgICAgICAgICBjb2xfaGVpZ2h0ID0gY29sX2hlYWRlci5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbF9oZWFkZXIub2Zmc2V0SGVpZ2h0ID4gMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc3RpY2t5U3R5bGUuaW5uZXJIVE1MID0gYFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC50YWJsZS1pZC0ke3RhYmxlLnRhYmxlSWR9ID4gLndndC1maWx0ZXJfY2VsbCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3A6ICR7Y29sX2hlYWRlci5vZmZzZXRIZWlnaHR9cHg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBgO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBUZXN0cyBpZiBhIHZhbHVlIGlzIGEgbnVtYmVyLCBieSBtYXRjaGluZyBhZ2FpbnN0IGEgUmVnZXguIFxyXG4gICAgICAgICAgICAgKiBPbiBzdWNjZXNzIHRoZSB0aGUgcGFyc2VkIG51bWJlciBpcyByZXR1cm5lZC4gXHJcbiAgICAgICAgICAgICAqIE9uIHVuZGVmaW5lZCBhbiBlbXB0eSBTdHJpbmcgaXMgcmV0dXJuZWQuXHJcbiAgICAgICAgICAgICAqIE90aGVyd2lzZSB0aGUgdGVzdFN0ciBpcyByZXR1cm5lZCB1bnBhcnNlZC4gXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSB0ZXN0U3RyIFxyXG4gICAgICAgICAgICAgKiBAcmV0dXJucyB7U3RyaW5nIHwgTnVtYmVyfSBcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHRyeVRyYW5zZm9ybVRvTnVtYmVyKHRlc3RTdHIpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0ZXN0U3RyID09IHVuZGVmaW5lZCkgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWF0Y2hlcyA9IHRlc3ROdW1iZXJSZWdleC5leGVjKHRlc3RTdHIudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBOdW1iZXIucGFyc2VGbG9hdChtYXRjaGVzWzFdKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdGVzdFN0cjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBDb21wYXJlIGZ1bmN0aW9uIGZvciBjb21wYXJpbmcgbnVtYmVycyBmb3Igc29ydGluZy4gQWRkaXRpb25hbGx5IHVuZGVmaW5lZCB2YWx1ZXMgYXJlIFxyXG4gICAgICAgICAgICAgKiBhbHdheXMgdGhlICdzbWFsbGVyJyB2YWx1ZSwgc28gdGhhdCB0aGV5IGdldCBzb3J0ZWQgdG8gdGhlIGJvdHRvbS5cclxuICAgICAgICAgICAgICogQ2FuIGJlIHJlcGxhY2VkIGJ5IHN1cHBseWluZyBhIGN1c3RvbSBjb21wYXJlIGZ1bmN0aW9uIHRvIFRhYmxlQ29tcG9uZW50LmN1c3RvbUNvbXBhcmVOdW1iZXJzLlxyXG4gICAgICAgICAgICAgKiBcclxuICAgICAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IGEgbnVtYmVyIHRvIGNvbXBhcmUuIFxyXG4gICAgICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gYiBudW1iZXIgdG8gY29tcGFyZS5cclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNvbXBhcmVOdW1iZXJzKGEsIGIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChhID09IHVuZGVmaW5lZCB8fCBhID09PSAnJykgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgICAgICBpZiAoYiA9PSB1bmRlZmluZWQgfHwgYiA9PT0gJycpIHJldHVybiAtMTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnlUcmFuc2Zvcm1Ub051bWJlcihiKSAtIHRyeVRyYW5zZm9ybVRvTnVtYmVyKGEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQ29tcGFyZSBmdW5jdGlvbiBmb3IgY29tcGFyaW5nIHN0cmluZ3MgZm9yIHNvcnRpbmcuIEFkZGl0aW9uYWxseSB1bmRlZmluZWQgdmFsdWVzIGFyZVxyXG4gICAgICAgICAgICAgKiBhbHdheXMgdGhlICdzbWFsbGVyJyB2YWx1ZSwgc28gdGhhdCB0aGV5IGdldCBzb3J0ZWQgdG8gdGhlIGJvdHRvbS4gXHJcbiAgICAgICAgICAgICAqIENhbiBiZSByZXBsYWNlZCBieSBzdXBwbHlpbmcgYSBjdXN0b20gY29tcGFyZSBmdW5jdGlvbiB0byBUYWJsZUNvbXBvbmVudC5jdXN0b21Db21wYXJlVGV4dC5cclxuICAgICAgICAgICAgICogXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhIHRleHQgdG8gY29tcGFyZS5cclxuICAgICAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGIgdGV4dCB0byBjb21wYXJlLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZnVuY3Rpb24gY29tcGFyZVRleHQoYSwgYikge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IDA7XHJcbiAgICAgICAgICAgICAgICBpZiAoYSA9PSB1bmRlZmluZWQgfHwgYSA9PT0gJycpIHJldHVybiAxO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIgPT0gdW5kZWZpbmVkIHx8IGIgPT09ICcnKSByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgICAgICBpZiAoYS50b1N0cmluZygpID4gYi50b1N0cmluZygpKSByZXN1bHQgPSAtMTtcclxuICAgICAgICAgICAgICAgIGlmIChhLnRvU3RyaW5nKCkgPCBiLnRvU3RyaW5nKCkpIHJlc3VsdCA9IDE7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogTWFwIGRpZmZlcmVudCBjb21wYXJlIGZ1bmN0aW9ucywgZGVwZW5kaW5nIG9uIHRoZSBjb250ZW50IG9mIHRoaXMgY29sdW1uLiBEZWZhdWx0IGlzIGEgZGlzdGluY3Rpb24gYmV0d2VlbiBudW1iZXJzIGFuZCB0ZXh0LlxyXG4gICAgICAgICAgICAgKiBUaGUgY2hvb3NlU29ydENvbXBhcmVGbiBhcyB3ZWxsIGFzIHRoZSBjb21wYXJlTnVtYmVycyBhbmQgY29tcGFyZVRleHQgZnVuY3Rpb25zIGNhbiBiZSByZXBsYWNlZCBieSBjdXN0b20gb25lcy5cclxuICAgICAgICAgICAgICogY2hvb3NlU29ydENvbXBhcmVGbiAtPiBUYWJsZUNvbXBvbmVudC5jdXN0b21DaG9vc2VTb3J0c0NvbXBhcmVGblxyXG4gICAgICAgICAgICAgKiBcclxuICAgICAgICAgICAgICogQHBhcmFtIHtUYWJsZUNvbXBvbmVudH0gdGFibGUgdGhlIGFjdGl2ZSBpbnN0YW5jZSBvZiBUYWJsZUNvbXBvbmVudC5cclxuICAgICAgICAgICAgICogQHBhcmFtIHtBcnJheTxPYmplY3Q+fSBkYXRhIFxyXG4gICAgICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29sdW1uIHRoZSBjb2x1bW4gbmFtZSAoaGVhZGVyKSBmb3Igd2hpY2ggYSBjb21wYXJlIGZ1bmN0aW9uIGlzIHRvIGNob29zZS4gXHJcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHsoYTogc3RyaW5nLCBiOiBzdHJpbmcpID0+IG51bWJlciB8IChhOiBudW1iZXIsIGI6IG51bWJlcikgPT4gbnVtYmVyfSB0aGUgY29tcGFyZSBmdW5jdGlvbiB0byBiZSB1c2VkXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBmdW5jdGlvbiBjaG9vc2VTb3J0c0NvbXBhcmVGbih0YWJsZSwgZGF0YSwgY29sdW1uKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpZighTnVtYmVyLmlzTmFOKGRhdGEucmVkdWNlKChjb2wsIGN1cikgPT4gKGNvbCArPSBjdXJbY29sdW1uXSAhPSB1bmRlZmluZWQgPyBOdW1iZXIucGFyc2VGbG9hdChjdXJbY29sdW1uXSkgOiAwKSwgMCkpKXtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmV2ZXJ5KHJvdyA9PiAodHlwZW9mKHRyeVRyYW5zZm9ybVRvTnVtYmVyKHJvd1tjb2x1bW5dKSkgPT0gJ251bWJlcicgfHwgcm93W2NvbHVtbl0gPT0gdW5kZWZpbmVkKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFibGUuY3VzdG9tQ29tcGFyZU51bWJlcnNcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhYmxlLmN1c3RvbUNvbXBhcmVUZXh0XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBSZWdpc3RlciB0aGUgVGFibGVDb21wb25lbnQgdG8gdGhlIGN1c3RvbUVsZW1lbnRSZWdpc3RyeSwgc28gdGhhdCBpdCBjYW4gYmUgdXNlZCBhcyBhIFdlYkNvbXBvbmVudC5cclxuICAgICAgICAgICAgICogXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Y2xhc3N9IFRhYmxlQ29tcG9uZW50IFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZnVuY3Rpb24gZGVmaW5lQ3VzdG9tRWxlbWVudCgpIHtcclxuICAgICAgICAgICAgICAgIGN1c3RvbUVsZW1lbnRzLmRlZmluZSgnd2MtZ3JpZC10YWJsZScsIFRhYmxlQ29tcG9uZW50KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gb25Tb3J0Q2xpY2sodGFibGUsIGNvbHVtbiwgZXZlbnQsIGRvUmVkcmF3KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGFibGUuaGVhZGVyLmluY2x1ZGVzKGNvbHVtbikpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGFibGUuc29ydGVkQnkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFibGUuc29ydGVkQnlbMF0uY29sID09PSBjb2x1bW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLnNvcnRlZEJ5WzBdLmRpciA9IHRhYmxlLnNvcnRlZEJ5WzBdLmRpciA9PT0gXCJhc2NcIiA/IFwiZGVzY1wiIDogXCJhc2NcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5pbm5lckhUTUwgPSB0YWJsZS5zb3J0ZWRCeVswXS5kaXIgPT09IFwiYXNjXCIgPyBcIiZ1YXJyO1wiIDogXCImZGFycjtcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRhYmxlLnNvcnRlZERhdGEgPSBbXS5jb25jYXQodGFibGUuc29ydGVkRGF0YS5maWx0ZXIoZW50cnkgPT4gZW50cnlbY29sdW1uXSAhPSB1bmRlZmluZWQpLnJldmVyc2UoKSwgdGFibGUuc29ydGVkRGF0YS5maWx0ZXIoZW50cnkgPT4gZW50cnlbY29sdW1uXSA9PSB1bmRlZmluZWQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRhYmxlLnJlZHJhd0RhdGEoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmhlYWRlci5maWx0ZXIoaGVhZGVyX2tleSA9PiBoZWFkZXJfa2V5ICE9PSBjb2x1bW4pLmZvckVhY2goaGVhZGVyX2tleSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbaGVhZGVyX2tleV0uaW5uZXJIVE1MICE9PSAnJiM4NjkzOycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1toZWFkZXJfa2V5XS5hcnJvd0FscGhhQ29sb3IgPSB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2hlYWRlcl9rZXldLmFycm93QWxwaGFDb2xvciAqIDAuNTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1toZWFkZXJfa2V5XS5zdHlsZS5jb2xvciA9IGByZ2IoMCwgMCwgMCwgJHt0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2hlYWRlcl9rZXldLmFycm93QWxwaGFDb2xvcn0pYDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLnNvcnRlZEJ5ID0gW10uY29uY2F0KFtuZXcgT2JqZWN0KHsgY29sOiBjb2x1bW4sIGRpcjogXCJhc2NcIiB9KV0sIHRhYmxlLnNvcnRlZEJ5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2NvbHVtbl0uaW5uZXJIVE1MID0gdGFibGUuc29ydGVkQnlbMF0uZGlyID09PSBcImFzY1wiID8gXCImdWFycjtcIiA6IFwiJmRhcnI7XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5hcnJvd0FscGhhQ29sb3IgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2NvbHVtbl0uc3R5bGUuY29sb3IgPSBgcmdiKDAsIDAsIDAsICR7dGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLmFycm93QWxwaGFDb2xvcn0pYDtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5zb3J0ZWRCeSA9IFtdLmNvbmNhdCh0YWJsZS5zb3J0ZWRCeSwgW25ldyBPYmplY3QoeyBjb2w6IGNvbHVtbiwgZGlyOiBcImFzY1wiIH0pXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5pbm5lckhUTUwgPSBcIiZ1YXJyO1wiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zb3J0QXJyb3dzW2NvbHVtbl0uYXJyb3dBbHBoYUNvbG9yID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLnN0eWxlLmNvbG9yID0gYHJnYigwLCAwLCAwLCAke3RhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXS5hcnJvd0FscGhhQ29sb3J9KWA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLnNlcmlhbGl6ZUxpbmtPcHRpb25zKClcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZG9SZWRyYXcpIHRhYmxlLnJlZHJhd0RhdGEoKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gdHJhbnNmb3JtVG9Hcm91cGVkRGF0YShpbml0aWFsRGF0YSwgZ3JvdXBDb2x1bW5zKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZ3JvdXBzID0gaW5pdGlhbERhdGEubWFwKGZ1bGxSb3cgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwQ29sdW1ucy5mb3JFYWNoKGdyb3VwQ29sdW1uID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtncm91cENvbHVtbl0gPSBmdWxsUm93W2dyb3VwQ29sdW1uXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAucmVkdWNlKChjb2wsIGN1cikgPT4gKCFjb2wuaW5jbHVkZXMoY3VyKSA/IFtdLmNvbmNhdChjb2wsIFtjdXJdKSA6IGNvbCksIFtdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhncm91cHMpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBmaWx0ZXJDaGFuZ2VkKHRhYmxlLCBjb2x1bW4sIGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlID0gMTtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmZpbHRlcltjb2x1bW5dID0gZXZlbnQuc3JjRWxlbWVudC50ZXh0Q29udGVudDtcclxuICAgICAgICAgICAgICAgIHRhYmxlLnJlZHJhd0RhdGEoKTtcclxuICAgICAgICAgICAgICAgIHRhYmxlLnNlcmlhbGl6ZUxpbmtPcHRpb25zKClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIHRhYmxlLmZpbHRlck5lZ2F0ZVtjb2x1bW5dID09PSB1bmRlZmluZWQgc2hhbGwgYmUgZXF1YWwgdG8gJ2NvbnRhaW5zJy5cclxuICAgICAgICAgICAgICogQHBhcmFtIHsqfSB0YWJsZSBcclxuICAgICAgICAgICAgICogQHBhcmFtIHsqfSBjb2x1bW4gXHJcbiAgICAgICAgICAgICAqIEBwYXJhbSB7Kn0gZXZlbnQgXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBmdW5jdGlvbiB0b2dnbGVGaWx0ZXJOZWdhdG9yKHRhYmxlLCBjb2x1bW4sIGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3T3BlcmF0aW9uID0gdGFibGUuYWN0aXZlRmlsdGVyT3BlcmF0aW9uc1tjb2x1bW5dO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5ld09wZXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8IG5ld09wZXJhdGlvbiA9PSAnJykgbmV3T3BlcmF0aW9uID0gdGFibGUuZmlsdGVyT3BlcmF0aW9uc1swXS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgbmV3T3BlcmF0aW9uID0gdGFibGUuZmlsdGVyT3BlcmF0aW9uc1sodGFibGUuZmlsdGVyT3BlcmF0aW9ucy5maW5kSW5kZXgoZWxlbWVudCA9PiAoZWxlbWVudC5uYW1lID09IG5ld09wZXJhdGlvbikpICsgMSkgJSB0YWJsZS5maWx0ZXJPcGVyYXRpb25zLmxlbmd0aF0ubmFtZTtcclxuICAgICAgICAgICAgICAgIGlmICh0YWJsZS5lbGVtZW50cy5maWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0pIHRhYmxlLmVsZW1lbnRzLmZpbHRlck9wZXJhdGlvbnNbY29sdW1uXS5pbm5lckhUTUwgPSB0YWJsZS5maWx0ZXJPcGVyYXRpb25zLmZpbmQob3AgPT4gb3AubmFtZSA9PSBuZXdPcGVyYXRpb24pLmNoYXI7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5hY3RpdmVGaWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0gPSBuZXdPcGVyYXRpb247XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5yZWRyYXdEYXRhKCk7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5zZXJpYWxpemVMaW5rT3B0aW9ucygpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBzZXRVcFNvcnRpbmcoZWxlbWVudCwgY29sdW1uLCB0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldmVudCkgPT4gb25Tb3J0Q2xpY2sodGFibGUsIGNvbHVtbiwgZXZlbnQsIHRydWUpKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBjcmVhdGVIZWFkZXJUb29sdGlwKHRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdG9vbHRpcCA9IHRhYmxlLmVsZW1lbnRzLnRvb2x0aXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgIHRvb2x0aXAuc3RhdGUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0TGVmdDogMFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdG9vbHRpcC5jbGFzc0xpc3QuYWRkKCdoZWFkZXItY29sLXRvb2x0aXAnKTtcclxuICAgICAgICAgICAgICAgIHRvb2x0aXAuY2xhc3NMaXN0LmFkZCgnd2d0LWNlbGwnKTtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmFwcGVuZCh0b29sdGlwKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBvbkhlYWRlck1vdXNlRW50ZXIodGFibGUsIGNvbHVtbkVsZW1lbnQsIGNvbHVtbk5hbWUpIHtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnRvb2x0aXAuaW5uZXJIVE1MID0gY29sdW1uTmFtZTtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnRvb2x0aXAuc3RhdGUub2Zmc2V0TGVmdCA9IGNvbHVtbkVsZW1lbnQub2Zmc2V0TGVmdDtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnRvb2x0aXAuc3R5bGUubGVmdCA9IGAkeyhjb2x1bW5FbGVtZW50Lm9mZnNldExlZnQpIC0gdGFibGUuc2Nyb2xsTGVmdH1weGA7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy50b29sdGlwLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gb25IZWFkZXJNb3VzZUxlYXZlKHRhYmxlLCBjb2x1bW5FbGVtZW50LCBjb2x1bW5OYW1lKSB7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy50b29sdGlwLmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gY3JlYXRlSGVhZGVyKHRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY29sX2hlaWdodCA9IDA7XHJcbiAgICAgICAgICAgICAgICBjcmVhdGVIZWFkZXJUb29sdGlwKHRhYmxlKTtcclxuICAgICAgICAgICAgICAgIGlmICghdGFibGUuZWxlbWVudHMuaGVhZGVyKSB0YWJsZS5lbGVtZW50cy5oZWFkZXIgPSB7fTtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmhlYWRlci5mb3JFYWNoKChjb2x1bW4sIGNvbHVtbkluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbF9oZWFkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgICAgICBjb2xfaGVhZGVyLmNsYXNzTGlzdC5hZGQoJ3dndC1oZWFkZXInKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9oZWFkZXIuY2xhc3NMaXN0LmFkZChgd2d0LWNvbHVtbl8ke2NvbHVtbi5zcGxpdCgnICcpLmpvaW4oJ18nKX1gKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9oZWFkZXIuY2xhc3NMaXN0LmFkZCgnd2d0LWNlbGwnKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY29sX2NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9jb250YWluZXIuY2xhc3NMaXN0LmFkZCgnd2d0LWNvbC1oZWFkZXItY29udGFpbmVyJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29sX2NvbnRhaW5lci5pbm5lckhUTUwgPSBjb2x1bW47XHJcbiAgICAgICAgICAgICAgICAgICAgY29sX2hlYWRlci5hcHBlbmQoY29sX2NvbnRhaW5lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgY29sX2hlYWRlci5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJywgb25IZWFkZXJNb3VzZUVudGVyLmJpbmQodGhpcywgdGFibGUsIGNvbF9oZWFkZXIsIGNvbHVtbikpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbF9oZWFkZXIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsIG9uSGVhZGVyTW91c2VMZWF2ZS5iaW5kKHRoaXMsIHRhYmxlLCBjb2xfaGVhZGVyLCBjb2x1bW4pKTtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZS5hcHBlbmQoY29sX2hlYWRlcilcclxuICAgICAgICAgICAgICAgICAgICBjb2xfaGVpZ2h0ID0gY29sX2hlYWRlci5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNvcnRfYXJyb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgICAgICBzb3J0X2Fycm93LmNsYXNzTGlzdC5hZGQoJ2Fycm93Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgc29ydF9hcnJvdy5pbm5lckhUTUwgPSAnJiM4NjkzOyc7XHJcbiAgICAgICAgICAgICAgICAgICAgc29ydF9hcnJvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25IZWFkZXJNb3VzZUxlYXZlKHRhYmxlLCBjb2xfaGVhZGVyLCBjb2x1bW4pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBzb3J0X2Fycm93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCBvbkhlYWRlck1vdXNlRW50ZXIuYmluZCh0aGlzLCB0YWJsZSwgY29sX2hlYWRlciwgY29sdW1uKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuaGVhZGVyW2NvbHVtbl0gPSBjb2xfaGVhZGVyO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnNvcnRBcnJvd3NbY29sdW1uXSA9IHNvcnRfYXJyb3c7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VXBTb3J0aW5nKHNvcnRfYXJyb3csIGNvbHVtbiwgdGFibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgY29sX2hlYWRlci5hcHBlbmQoc29ydF9hcnJvdylcclxuXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHRhYmxlLmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLnRvb2x0aXAuc3R5bGUubGVmdCA9IGAkeyh0YWJsZS5lbGVtZW50cy50b29sdGlwLnN0YXRlLm9mZnNldExlZnQpIC0gdGFibGUuc2Nyb2xsTGVmdH1weGA7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YU9iaiA9IEpTT04ucGFyc2UoZXZlbnQuZGF0YSk7IC8vIGRhdGFPYmogPSB7dHlwZTogJ2ZpeC1jb2x1bW5zJywgZWxlbWVudDogdW5kZWZpbmVkLCBkYXRhOiB1bmRlZmluZWR9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhT2JqLnR5cGUgPT09ICdmaXgtY29sdW1ucycpIGZpeENvbHVtbkhlYWRlcih0YWJsZSwgY29sX2hlaWdodCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZml4Q29sdW1uSGVhZGVyLmJpbmQodGhpcywgdGFibGUsIGNvbF9oZWlnaHQpLCAxMDAwKTtcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVTdGlja3lGaWx0ZXJTdHlsZSh0YWJsZSwgY29sX2hlaWdodCk7XHJcbiAgICAgICAgICAgICAgICB9KTsgLy8gY3JlYXRlU3RpY2t5RmlsdGVyU3R5bGUodGFibGUsIGNvbF9oZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBjcmVhdGVTdGlja3lGaWx0ZXJTdHlsZSh0YWJsZSwgY29sX2hlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHRtcF9zdHlsZSA9IHRhYmxlLmVsZW1lbnRzLnN0aWNreVN0eWxlO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0bXBfc3R5bGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5zdGlja3lTdHlsZSA9IHRtcF9zdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdG1wX3N0eWxlLnR5cGUgPSBcInRleHQvY3NzXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgdG1wX3N0eWxlLmNsYXNzTGlzdC5hZGQoJ3N0aWNreV9maWx0ZXJfb2Zmc2V0Jyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0bXBfc3R5bGUuaW5uZXJIVE1MID0gYFxyXG4gICAgICAudGFibGUtaWQtJHt0YWJsZS50YWJsZUlkfSA+IC53Z3QtZmlsdGVyX2NlbGwge1xyXG4gICAgICAgIHRvcDogJHtjb2xfaGVpZ2h0fXB4O1xyXG4gICAgICB9XHJcbiAgICBgO1xyXG4gICAgICAgICAgICAgICAgdGFibGUucm9vdF9kb2N1bWVudC5oZWFkLmFwcGVuZCh0bXBfc3R5bGUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBjcmVhdGVGaWx0ZXIodGFibGUsIGhlYWRlciwgZmlsdGVyKSB7XHJcbiAgICAgICAgICAgICAgICB0YWJsZS5lbGVtZW50cy5maWx0ZXJDZWxscyA9IHt9O1xyXG4gICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuZmlsdGVyT3BlcmF0aW9ucyA9IHt9O1xyXG4gICAgICAgICAgICAgICAgaGVhZGVyLmZvckVhY2goY29sdW1uID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZmlsdGVyX2NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGxldCBmaWx0ZXJfaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbHRlcl9pbnB1dC50eXBlID0gJ3RleHQnO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbHRlcl9pbnB1dC5jbGFzc0xpc3QuYWRkKCd3Z3QtZmlsdGVyX2lucHV0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyX2lucHV0LnZhbHVlID0gZmlsdGVyW2NvbHVtbl0gPyBmaWx0ZXJbY29sdW1uXSA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbHRlcl9jb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBldmVudCA9PiBmaWx0ZXJDaGFuZ2VkLmJpbmQobnVsbCwgdGFibGUsIGNvbHVtbikoZXZlbnQpKVxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcl9jb250YWluZXIuY2xhc3NMaXN0LmFkZCgnd2d0LWZpbHRlcl9jZWxsJywgYHdndC1maWx0ZXJfY2VsbF8ke2NvbHVtbi5zcGxpdCgnICcpLmpvaW4oJ18nKX1gLCAnd2d0LWZpbHRlcl9pbnB1dCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGZpbHRlcl9jb250YWluZXIuY29udGVudEVkaXRhYmxlID0gJ3RydWUnO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgZmlsdGVyX2lucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJfaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCBldmVudCA9PiBmaWx0ZXJDaGFuZ2VkLmJpbmQobnVsbCwgdGFibGUsIGNvbHVtbikoZXZlbnQpKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJfaW5wdXQuY2xhc3NMaXN0LmFkZCgnZmlsdGVyX2lucHV0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyX2lucHV0LmNvbnRlbnRFZGl0YWJsZSA9ICd0cnVlJztcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZmlsdGVyX25lZ2F0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmZpbHRlck9wZXJhdGlvbnNbY29sdW1uXSA9IGZpbHRlcl9uZWdhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyX25lZ2F0ZS5pbm5lckhUTUwgPSAnJnN1YmU7JztcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJfbmVnYXRlLmNsYXNzTGlzdC5hZGQoJ2ZpbHRlcl9uZWdhdG9yJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcl9uZWdhdGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB0b2dnbGVGaWx0ZXJOZWdhdG9yLmJpbmQobnVsbCwgdGFibGUsIGNvbHVtbikoZXZlbnQpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBmaWx0ZXJfbmVnYXRlLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyX25lZ2F0ZS5zdHlsZS5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlsdGVyX2NvbnRhaW5lci5hcHBlbmQoZmlsdGVyX2lucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJfY29udGFpbmVyLmFwcGVuZChmaWx0ZXJfaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcl9jb250YWluZXIuYXBwZW5kKGZpbHRlcl9uZWdhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmZpbHRlckNlbGxzW2NvbHVtbl0gPSBmaWx0ZXJfY29udGFpbmVyO1xyXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmFwcGVuZChmaWx0ZXJfY29udGFpbmVyKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNyZWF0ZVJlc2V0TGlua0J1dHRvbih0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgYnRuLmNsYXNzTGlzdC5hZGQoJ2Zvb3Rlci1idXR0b24nLCAnd2d0LWZvb3Rlci1jZWxsJywgJ3dndC1jZWxsJyk7XHJcbiAgICAgICAgICAgICAgICBidG4uaW5uZXJIVE1MID0gJ3Jlc2V0JztcclxuICAgICAgICAgICAgICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpcm0oJ1NpY2hlciwgZGFzcyBhbGxlIGFuZ2V3ZW5kZXRlbiBVbWZvcm11bmdlbiB6dXLDvGNrZ2VzZXR6dCB3ZXJkZW4gc29sbGVuJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHVybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybC5zZWFyY2ggPSAnPycgKyB1cmwuc2VhcmNoLnNsaWNlKDEpLnNwbGl0KCcmJykuZmlsdGVyKGVudHJ5ID0+ICFlbnRyeS5zcGxpdCgnPScpWzBdLnN0YXJ0c1dpdGgoJ3RhYmxlJykpLmpvaW4oJyYnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uaHJlZiA9IHVybC5ocmVmO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ0bjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gY3JlYXRlRm9vdGVyKHRhYmxlLCBkYXRhLCBwYWdlQ2hvb3Nlcikge1xyXG4gICAgICAgICAgICAgICAgYmluZENvbHVtbkNob29zZXJIYW5kbGVyKHRhYmxlKTtcclxuICAgICAgICAgICAgICAgIGxldCBmb290ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgIGZvb3Rlci5jbGFzc0xpc3QuYWRkKCd3Z3QtZm9vdGVyJylcclxuICAgICAgICAgICAgICAgIGZvb3Rlci5zdHlsZS5ncmlkQ29sdW1uID0gYDEgLyAke3RhYmxlLmhlYWRlci5sZW5ndGggKyAxfWBcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJNZW51Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3Nlck1lbnVDb250YWluZXIgPSBjcmVhdGVDb2x1bW5DaG9vc2VyTWVudUNvbnRhaW5lcih0YWJsZSwgdGFibGUuaGVhZGVyQWxsKTtcclxuICAgICAgICAgICAgICAgICAgICB0YWJsZS5wYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZSh0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyTWVudUNvbnRhaW5lciwgdGFibGUubmV4dFNpYmxpbmcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCB0b3RhbF9yb3dzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICB0b3RhbF9yb3dzLmlubmVySFRNTCA9IGBUb3RhbDogJHt0YWJsZS5kYXRhLmxlbmd0aH1gO1xyXG4gICAgICAgICAgICAgICAgdG90YWxfcm93cy5jbGFzc0xpc3QuYWRkKCd3Z3QtZm9vdGVyX2NlbGwnLCAnd2d0LWNlbGwnKVxyXG4gICAgICAgICAgICAgICAgZm9vdGVyLmFwcGVuZCh0b3RhbF9yb3dzKVxyXG4gICAgICAgICAgICAgICAgdGFibGUuZWxlbWVudHMudG90YWxfcm93cyA9IHRvdGFsX3Jvd3M7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRhYmxlLmRhdGEubGVuZ3RoICE9PSBkYXRhLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBmaWx0ZXJlZF9yb3dfY291bnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZF9yb3dfY291bnQuaW5uZXJIVE1MID0gYEZpbHRlcmVkOiAke2RhdGEubGVuZ3RofSR7dGFibGUucGFnaW5hdGlvbi5hY3RpdmUgPyBgIC8gJHt0YWJsZS5wYWdpbmF0aW9uLmZpbHRlcmVkRGF0YUNvdW50fWAgOiAnJ31gO1xyXG4gICAgICBmaWx0ZXJlZF9yb3dfY291bnQuY2xhc3NMaXN0LmFkZCgnd2d0LWZvb3Rlcl9jZWxsJywgJ3dndC1jZWxsJylcclxuICAgICAgZm9vdGVyLmFwcGVuZChmaWx0ZXJlZF9yb3dfY291bnQpXHJcbiAgICAgIHRhYmxlLmVsZW1lbnRzLmZpbHRlcmVkX3Jvd19jb3VudCA9IGZpbHRlcmVkX3Jvd19jb3VudDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYoZm9vdGVyKSBmb290ZXIuYXBwZW5kKGNyZWF0ZUNvbHVtbkNob29zZXJCdXR0b24odGFibGUpKTtcclxuICAgIGlmKHRhYmxlLmRyYXdPcHRpb25hbHMucmV3cml0ZXVybCkgZm9vdGVyLmFwcGVuZChjcmVhdGVSZXNldExpbmtCdXR0b24odGFibGUpKTtcclxuICAgIGlmKHBhZ2VDaG9vc2VyKSBmb290ZXIuYXBwZW5kKHBhZ2VDaG9vc2VyKTtcclxuICAgIGlmKHRhYmxlLmVsZW1lbnRzLmZvb3RlcikgdGFibGUuZWxlbWVudHMuZm9vdGVyLnJlbW92ZSgpO1xyXG4gICAgdGFibGUuZWxlbWVudHMuZm9vdGVyID0gZm9vdGVyO1xyXG4gICAgdGFibGUuYXBwZW5kKGZvb3Rlcik7XHJcbiAgfVxyXG5cclxuICBsZXQgYm91bmRDb2x1bW5DaG9vc2VyQnV0dG9uSGFuZGxlciA9IHVuZGVmaW5lZDtcclxuICBsZXQgYm91bmRDb2x1bW5DaG9vc2VyT3V0c2lkZUhhbmRsZXIgPSB1bmRlZmluZWQ7XHJcbiAgbGV0IGJvdW5kQ29sdW1uQ2hvb3NlckNoYW5nZUNvbHVtbkhhbmRsZXIgPSB1bmRlZmluZWQ7XHJcblxyXG4gIGZ1bmN0aW9uIGJpbmRDb2x1bW5DaG9vc2VySGFuZGxlcih0YWJsZSl7XHJcbiAgICBib3VuZENvbHVtbkNob29zZXJCdXR0b25IYW5kbGVyID0gb25Db2x1bW5DaG9vc2VyQnV0dG9uSGFuZGxlci5iaW5kKG51bGwsIHRhYmxlKTtcclxuICAgIGJvdW5kQ29sdW1uQ2hvb3Nlck91dHNpZGVIYW5kbGVyID0gb25Db2x1bW5DaG9vc2VyT3V0c2lkZUhhbmRsZXIuYmluZChudWxsLCB0YWJsZSk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBjcmVhdGVDb2x1bW5DaG9vc2VyQnV0dG9uKHRhYmxlKXtcclxuICAgIGxldCBidXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIGJ1dC5jbGFzc0xpc3QuYWRkKCd3Z3QtZm9vdGVyX2NlbGwnLCAnd2d0LWNlbGwnLCAnZm9vdGVyLWJ1dHRvbi1kb3duJywgJ2Zvb3Rlci1idXR0b24nKTtcclxuICAgIGJ1dC5pbm5lckhUTUwgPSAnY29sdW1ucyc7XHJcbiAgICBidXQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBib3VuZENvbHVtbkNob29zZXJCdXR0b25IYW5kbGVyKTtcclxuICAgIHJldHVybiBidXQ7ICAgIFxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY3JlYXRlQ29sdW1uQ2hvb3Nlck1lbnVJdGVtcyh0YWJsZSwgY29sdW1uKXtcclxuICAgIGxldCBjb2xJdGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcclxuICAgIGNvbEl0ZW0uY2xhc3NMaXN0LmFkZCgnY29sdW1uLWNob29zZXItaXRlbScsICdjb2x1bW4tY2hvb3NlcicpO1xyXG4gICAgbGV0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcclxuICAgIGxhYmVsLmlubmVySFRNTCA9IGNvbHVtbjtcclxuICAgIGxhYmVsLnNldEF0dHJpYnV0ZSgnbmFtZScsIGNvbHVtbiArICdfY2hlY2tib3gnKTtcclxuICAgIGxhYmVsLmNsYXNzTGlzdC5hZGQoJ2NvbHVtbi1jaG9vc2VyJyk7XHJcbiAgICBsZXQgY2hlY2tCb3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xyXG4gICAgY2hlY2tCb3guc2V0QXR0cmlidXRlKCd0eXBlJywgJ2NoZWNrYm94Jyk7XHJcbiAgICBjaGVja0JveC5zZXRBdHRyaWJ1dGUoJ25hbWUnLCBjb2x1bW4gKyAnX2NoZWNrYm94Jyk7XHJcbiAgICBpZighdGFibGUuaGlkZGVuQ29sdW1ucy5pbmNsdWRlcyhjb2x1bW4pIHx8IHRhYmxlLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKGNvbHVtbikpe1xyXG4gICAgICBjaGVja0JveC50b2dnbGVBdHRyaWJ1dGUoJ2NoZWNrZWQnKTtcclxuICAgIH1cclxuICAgIGNoZWNrQm94LmNsYXNzTGlzdC5hZGQoJ2NvbHVtbi1jaG9vc2VyJyk7XHJcbiAgICBib3VuZENvbHVtbkNob29zZXJDaGFuZ2VDb2x1bW5IYW5kbGVyID0gb25Db2x1bW5DaG9vc2VyQ2hhbmdlQ29sdW1uSGFuZGxlci5iaW5kKG51bGwsIHRhYmxlLCBjb2x1bW4pO1xyXG4gICAgY2hlY2tCb3guYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgYm91bmRDb2x1bW5DaG9vc2VyQ2hhbmdlQ29sdW1uSGFuZGxlcik7XHJcbiAgICB0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyQ2hlY2tib3hbY29sdW1uXSA9IGNoZWNrQm94O1xyXG4gICAgbGFiZWwucHJlcGVuZChjaGVja0JveCk7XHJcbiAgICAvLyBsYWJlbC5pbm5lckhUTUwgKz0gY29sdW1uOyBcclxuICAgIGNvbEl0ZW0uYXBwZW5kKGxhYmVsKTtcclxuICAgIHJldHVybiBjb2xJdGVtO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gY3JlYXRlQ29sdW1uQ2hvb3Nlck1lbnVDb250YWluZXIodGFibGUsIGFsbEhlYWRlcil7XHJcbiAgICBpZighdGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3NlckNoZWNrYm94KSB0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyQ2hlY2tib3ggPSB7fTtcclxuICAgIGxldCBtZW51ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKTtcclxuICAgIG1lbnUuY2xhc3NMaXN0LmFkZCgnY29sdW1uLWNob29zZXItbWVudScsICdjb2x1bW4tY2hvb3NlcicpO1xyXG4gICAgbGV0IG1lbnVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgIG1lbnVDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnY29sdW1uLWNob29zZXItbWVudS1jb250YWluZXInLCAnaGlkZGVuJylcclxuICAgIGNvbnNvbGUubG9nKChuZXcgU2V0KGFsbEhlYWRlcikpLnVuaW9uKHRhYmxlLmhpZGRlbkNvbHVtbnMpKTtcclxuICAgICgobmV3IFNldChhbGxIZWFkZXIpKS51bmlvbih0YWJsZS5oaWRkZW5Db2x1bW5zKSkuZm9yRWFjaChjb2x1bW4gPT4ge1xyXG4gICAgICBtZW51LmFwcGVuZChjcmVhdGVDb2x1bW5DaG9vc2VyTWVudUl0ZW1zKHRhYmxlLCBjb2x1bW4pKTtcclxuICAgIH0pXHJcbiAgICBtZW51Q29udGFpbmVyLmFwcGVuZChtZW51KVxyXG4gICAgLy8gdGFibGUuZWxlbWVudHMuY29sdW1uQ2hvb3Nlck1lbnVDb250YWluZXIgPSBtZW51Q29udGFpbmVyO1xyXG4gICAgcmV0dXJuIG1lbnVDb250YWluZXI7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBvbkNvbHVtbkNob29zZXJCdXR0b25IYW5kbGVyKHRhYmxlLCBldmVudCl7XHJcbiAgICBsZXQgb2Zmc2V0ID0gdGFibGUub2Zmc2V0TGVmdDtcclxuXHJcbiAgICBpZih0YWJsZS5lbGVtZW50cy50b3RhbF9yb3dzKXtcclxuICAgICAgb2Zmc2V0ICs9IHRhYmxlLmVsZW1lbnRzLnRvdGFsX3Jvd3Mub2Zmc2V0V2lkdGg7XHJcbiAgICB9XHJcbiAgICBpZih0YWJsZS5lbGVtZW50cy5maWx0ZXJlZF9yb3dfY291bnQpe1xyXG4gICAgICBvZmZzZXQgKz0gdGFibGUuZWxlbWVudHMuZmlsdGVyZWRfcm93X2NvdW50Lm9mZnNldFdpZHRoO1xyXG4gICAgfVxyXG5cclxuICAgIHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJNZW51Q29udGFpbmVyLnN0eWxlLmxlZnQgPSBgJHtvZmZzZXR9cHhgO1xyXG5cclxuICAgIGxldCBjbGFzc0xpc3QgPSB0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyTWVudUNvbnRhaW5lci5jbGFzc0xpc3Q7XHJcbiAgICBpZihjbGFzc0xpc3QuY29udGFpbnMoJ2hpZGRlbicpKXtcclxuICAgICAgY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XHJcbiAgICAgIHRhYmxlLnJvb3RfZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBib3VuZENvbHVtbkNob29zZXJPdXRzaWRlSGFuZGxlcilcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpXHJcbiAgICAgIHRhYmxlLnJvb3RfZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBib3VuZENvbHVtbkNob29zZXJPdXRzaWRlSGFuZGxlcilcclxuICAgIH1cclxuXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBvbkNvbHVtbkNob29zZXJPdXRzaWRlSGFuZGxlcih0YWJsZSwgZXZlbnQpe1xyXG4gICAgaWYoIWV2ZW50LnNyY0VsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdjb2x1bW4tY2hvb3NlcicpKXtcclxuICAgICAgaWYoIWV2ZW50LnNyY0VsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdmb290ZXItYnV0dG9uJykpe1xyXG4gICAgICAgIGxldCBjbGFzc0xpc3QgPSB0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyTWVudUNvbnRhaW5lci5jbGFzc0xpc3Q7XHJcbiAgICAgICAgY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XHJcbiAgICAgICAgdGFibGUucm9vdF9kb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIGJvdW5kQ29sdW1uQ2hvb3Nlck91dHNpZGVIYW5kbGVyKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBvbkNvbHVtbkNob29zZXJDaGFuZ2VDb2x1bW5IYW5kbGVyKHRhYmxlLCBjb2x1bW4sIGV2ZW50KXtcclxuICAgIGlmKGV2ZW50LnNyY0VsZW1lbnQuY2hlY2tlZCl7XHJcbiAgICAgIHRhYmxlLmhpZGRlbkNvbHVtbnMgPSB0YWJsZS5oaWRkZW5Db2x1bW5zLmZpbHRlcihlbnRyeSA9PiBlbnRyeSAhPSBjb2x1bW4pO1xyXG4gICAgICB0YWJsZS52aXNpYmxlQ29sdW1ucy5wdXNoKGNvbHVtbik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0YWJsZS5oaWRkZW5Db2x1bW5zLnB1c2goY29sdW1uKTtcclxuICAgICAgdGFibGUudmlzaWJsZUNvbHVtbnMgPSB0YWJsZS52aXNpYmxlQ29sdW1ucy5maWx0ZXIoZW50cnkgPT4gZW50cnkgIT09IGNvbHVtbik7XHJcbiAgICB9XHJcbiAgICB0YWJsZS5zZXJpYWxpemVMaW5rT3B0aW9ucygpO1xyXG4gICAgdGFibGUucmVkcmF3VGFibGUoKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGZpbGxEYXRhKHRhYmxlLCBkYXRhKXtcclxuICAgIHRhYmxlLmVsZW1lbnRzLmRhdGFDZWxscyA9IHt9O1xyXG4gICAgZGF0YS5mb3JFYWNoKChyb3csIHJvd0luZGV4KSA9PiB7XHJcbiAgICAgIHRhYmxlLmhlYWRlci5mb3JFYWNoKCAoY29sdW1uLCBjb2x1bW5JbmRleCkgPT4ge1xyXG4gICAgICAgIGxldCBjZWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgY2VsbC5jbGFzc0xpc3QuYWRkKCd3Z3QtY2VsbCcsICd3Z3QtZGF0YS1jZWxsJywgYHdndC1jb2x1bW5fJHtjb2x1bW4uc3BsaXQoJyAnKS5qb2luKCdfJyl9YCwgYHdndC1yb3dfJHtyb3dJbmRleH1gLCBgd2d0LXplYnJhXyR7cm93SW5kZXggJSAyfWApXHJcbiAgICAgICAgLy8gY2VsbC5jbGFzc0xpc3QuYWRkKClcclxuICAgICAgICAvLyBjZWxsLmNsYXNzTGlzdC5hZGQoKVxyXG4gICAgICAgIGNlbGwuaW5uZXJIVE1MID0gcm93W2NvbHVtbl0gIT0gdW5kZWZpbmVkID8gcm93W2NvbHVtbl0gOiAnJztcclxuICAgICAgICBpZihjb2x1bW4gPT09ICcjaW5jbHVkZScpIHtcclxuICAgICAgICAgIGNlbGwuc2V0QXR0cmlidXRlKCdjb250ZW50RWRpdGFibGUnLCAndHJ1ZScpO1xyXG4gICAgICAgICAgbGV0IHRlbXBSb3dBY3RpdmUgPSB7Li4ucm93fTtcclxuICAgICAgICAgIGRlbGV0ZSB0ZW1wUm93QWN0aXZlWycjaW5jbHVkZSddO1xyXG4gICAgICAgICAgLy8gY29uc29sZS5sb2codGFibGUudGlja2VkUm93cyk7XHJcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0ZW1wUm93QWN0aXZlKSk7XHJcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0YWJsZS50aWNrZWRSb3dzLmluY2x1ZGVzKEpTT04uc3RyaW5naWZ5KHRlbXBSb3dBY3RpdmUpKSk7XHJcbiAgICAgICAgICBjZWxsLmlubmVyVGV4dCA9IHRhYmxlLnRpY2tlZFJvd3MuaW5jbHVkZXMoSlNPTi5zdHJpbmdpZnkodGVtcFJvd0FjdGl2ZSkpID8gJ3gnIDogJyc7XHJcbiAgICAgICAgICBjZWxsLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGV2ZW50KSA9PiB7ICAgICAgIFxyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnaW5wdXQgY2hhbmdlZCBpbiByb3cgJyArIHJvd0luZGV4KTsgICAgIFxyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhldmVudC50YXJnZXQuaW5uZXJUZXh0KTtcclxuICAgICAgICAgICAgbGV0IHRlbXBSb3cgPSB7Li4ucm93fTtcclxuICAgICAgICAgICAgZGVsZXRlIHRlbXBSb3dbJyNpbmNsdWRlJ107XHJcbiAgICAgICAgICAgIGlmKGV2ZW50LnRhcmdldC5pbm5lclRleHQpe1xyXG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdhZGRlZCByb3cnKTtcclxuICAgICAgICAgICAgICB0YWJsZS50aWNrZWRSb3dzLnB1c2goIEpTT04uc3RyaW5naWZ5KHRlbXBSb3cpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygncmVtb3ZlZCByb3cnKTtcclxuICAgICAgICAgICAgICB0YWJsZS50aWNrZWRSb3dzID0gdGFibGUudGlja2VkUm93cy5maWx0ZXIodmFsdWUgPT4gKHZhbHVlICE9PSBKU09OLnN0cmluZ2lmeSh0ZW1wUm93KSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRhYmxlLnNlcmlhbGl6ZUxpbmtPcHRpb25zKCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoIXRhYmxlLmVsZW1lbnRzLmRhdGFDZWxsc1tjb2x1bW5dKSB0YWJsZS5lbGVtZW50cy5kYXRhQ2VsbHNbY29sdW1uXSA9IFtdO1xyXG4gICAgICAgIHRhYmxlLmVsZW1lbnRzLmRhdGFDZWxsc1tjb2x1bW5dLnB1c2goY2VsbCk7XHJcbiAgICAgICAgdGFibGUuYXBwZW5kKGNlbGwpXHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVhZCB0aGUgY29sdW1uIG5hbWVzIChoZWFkZXIpIGZyb20gdGhlIGRhdGEsIGlmIHRoZXkgYXJlIG5vdCBzdXBwbHllZC4gXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHtBcnJheTxPYmplY3Q+fSBkYXRhIFxyXG4gICAqIEByZXR1cm5zIHtBcnJheTxzdHJpbmc+fSB0aGUgbGlzdCBvZiBjb2x1bW4gbmFtZXMuXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZ2VuZXJhdGVIZWFkZXIoZGF0YSl7XHJcbiAgICByZXR1cm4gZGF0YS5tYXAoT2JqZWN0LmtleXMpLnJlZHVjZSgoY29sLCBjdXIpID0+IHtcclxuICAgICAgbGV0IHJlc3VsdCA9IGNvbDtcclxuICAgICAgY3VyLmZvckVhY2godmFsdWUgPT4ge1xyXG4gICAgICAgIGlmKCFjb2wuaW5jbHVkZXModmFsdWUpKSByZXN1bHQucHVzaCh2YWx1ZSlcclxuICAgICAgfSlcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0sIFtdKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwbHlDb25kaXRpb25hbENvbHVtblN0eWxpbmcodGFibGUsIGRhdGEsIGhlYWRlciwgY29uZGl0aW9uYWxDb2x1bW5TdHlsZSwgb3B0aW9ucyl7XHJcbiAgICBpZihvcHRpb25zLmFjdGl2ZSl7XHJcbiAgICAgIGxldCBjb2x1bW5fc3R5bGVfZWxlbWVudCA9IHRhYmxlLmVsZW1lbnRzLmNvbHVtblN0eWxlO1xyXG4gICAgICBpZighY29sdW1uX3N0eWxlX2VsZW1lbnQpe1xyXG4gICAgICAgIHRhYmxlLmVsZW1lbnRzLmNvbHVtblN0eWxlID0gY29sdW1uX3N0eWxlX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgIGNvbHVtbl9zdHlsZV9lbGVtZW50LnR5cGUgPSBcInRleHQvY3NzXCI7XHJcbiAgICAgICAgY29sdW1uX3N0eWxlX2VsZW1lbnQuY2xhc3NMaXN0LmFkZCgnY29sdW1uX3N0eWxlcycpO1xyXG4gICAgICAgIHRhYmxlLnJvb3RfZG9jdW1lbnQuaGVhZC5hcHBlbmQoY29sdW1uX3N0eWxlX2VsZW1lbnQpO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbHVtbl9zdHlsZV9lbGVtZW50LmlubmVySFRNTCA9ICcnO1xyXG4gICAgICBoZWFkZXIuZm9yRWFjaChjb2x1bW4gPT4ge1xyXG4gICAgICAgIGNvbmRpdGlvbmFsQ29sdW1uU3R5bGUuZm9yRWFjaCgoY29uZGl0aW9uYWxTdHlsZSkgPT4ge1xyXG4gICAgICAgICAgaWYoY29uZGl0aW9uYWxTdHlsZS5jb25kaXRpb24oZGF0YSwgY29sdW1uKSl7XHJcbiAgICAgICAgICAgIGNvbHVtbl9zdHlsZV9lbGVtZW50LmlubmVySFRNTCArPSBgXHJcbiAgICAgICAgICAgICAgZGl2LndndC1jb2x1bW5fJHtjb2x1bW59LndndC1kYXRhLWNlbGwge1xyXG4gICAgICAgICAgICAgICAgJHtjb25kaXRpb25hbFN0eWxlLnN0eWxlcy5qb2luKCdcXG4nKX1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGBcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwbHlDb25kaXRpb25hbFJvd1N0eWxpbmcodGFibGUsIGRhdGEsIGhlYWRlciwgY29uZGl0aW9uYWxSb3dTdHlsZSwgb3B0aW9ucyl7XHJcbiAgICBpZihvcHRpb25zLmFjdGl2ZSl7XHJcbiAgICAgIGxldCByb3dfc3R5bGVfZWxlbWVudCA9IHRhYmxlLmVsZW1lbnRzLmNvbHVtblN0eWxlO1xyXG4gICAgICBpZighcm93X3N0eWxlX2VsZW1lbnQpe1xyXG4gICAgICAgIHRhYmxlLmVsZW1lbnRzLmNvbHVtblN0eWxlID0gcm93X3N0eWxlX2VsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgIHJvd19zdHlsZV9lbGVtZW50LnR5cGUgPSBcInRleHQvY3NzXCI7XHJcbiAgICAgICAgcm93X3N0eWxlX2VsZW1lbnQuY2xhc3NMaXN0LmFkZCgncm93X3N0eWxlcycpO1xyXG4gICAgICAgIHRhYmxlLnJvb3RfZG9jdW1lbnQuaGVhZC5hcHBlbmQocm93X3N0eWxlX2VsZW1lbnQpO1xyXG4gICAgICB9XHJcbiAgICAgIHJvd19zdHlsZV9lbGVtZW50LmlubmVySFRNTCA9ICcnO1xyXG4gICAgICBPYmplY3Qua2V5cyhjb25kaXRpb25hbFJvd1N0eWxlKS5mb3JFYWNoKGNvbHVtbiA9PiB7XHJcbiAgICAgICAgZGF0YS5mb3JFYWNoKChyb3csIHJvd19pbmRleCkgPT4ge1xyXG4gICAgICAgICAgY29uZGl0aW9uYWxSb3dTdHlsZVtjb2x1bW5dLmZvckVhY2goY29uZGl0aW9uYWxTdHlsZSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGNvbmRpdGlvbmFsU3R5bGUuY29uZGl0aW9uKHJvd1tjb2x1bW5dLCByb3dfaW5kZXgpKXtcclxuICAgICAgICAgICAgICByb3dfc3R5bGVfZWxlbWVudC5pbm5lckhUTUwgKz0gYGRpdiR7Y29uZGl0aW9uYWxTdHlsZS5mdWxscm93ID8gJycgOiBgLndndC1jb2x1bW5fJHtjb2x1bW59YH0ud2d0LXJvd18ke3Jvd19pbmRleH0ge1xcbmBcclxuICAgICAgICAgICAgICByb3dfc3R5bGVfZWxlbWVudC5pbm5lckhUTUwgKz0gY29uZGl0aW9uYWxTdHlsZS5zdHlsZXMuam9pbignXFxuJylcclxuICAgICAgICAgICAgICByb3dfc3R5bGVfZWxlbWVudC5pbm5lckhUTUwgKz0gJ1xcbn0nXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSkgXHJcbiAgICAgIH0pXHJcbiAgICAgIC8vIHRhYmxlLnJvb3RfZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaGVhZCcpLmFwcGVuZChyb3dfc3R5bGVfZWxlbWVudClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlc2V0U29ydGluZyh0YWJsZSl7XHJcbiAgICB0YWJsZS5zb3J0ZWREYXRhID0gdGFibGUuZGF0YSA/IHRhYmxlLmRhdGEubWFwKHZhbHVlID0+IHZhbHVlKSA6IFtdO1xyXG4gICAgdGFibGUuc29ydGVkQnkgPSBbXTtcclxuICAgIGlmKHRhYmxlLmhlYWRlcikgdGFibGUuaGVhZGVyLmZvckVhY2goY29sdW1uID0+IHtcclxuICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLmlubmVySFRNTCA9ICcmIzg2OTM7JztcclxuICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLmFycm93QWxwaGFDb2xvciA9IDEuMDtcclxuICAgICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93c1tjb2x1bW5dLnN0eWxlLmNvbG9yID0gYGxpZ2h0Z3JheWA7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlc2V0RmlsdGVyT3BlcmF0aW9ucyh0YWJsZSl7XHJcbiAgICB0YWJsZS5oZWFkZXIuZm9yRWFjaChjb2x1bW4gPT4ge1xyXG4gICAgICBsZXQgb3BlcmF0aW9uID0gdGFibGUuZmlsdGVyT3BlcmF0aW9ucy5maW5kKG9wID0+IChvcC5uYW1lID09IHRhYmxlLmFjdGl2ZUZpbHRlck9wZXJhdGlvbnNbY29sdW1uXSkpO1xyXG4gICAgICBpZihvcGVyYXRpb24pIHRhYmxlLmVsZW1lbnRzLmZpbHRlck9wZXJhdGlvbnNbY29sdW1uXS5pbm5lckhUTUwgPSBvcGVyYXRpb24uY2hhcjtcclxuICAgIH0pOyAgICBcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNvcnRzIHRoZSBkYXRhLCBiZSB0aGUgc3BjaWZpZWQgc29ydGluZyAodGFibGUuc29ydGVkQnkpLlxyXG4gICAqIEBwYXJhbSB7VGFibGVDb21wb25lbnR9IHRhYmxlIHJlZmVyZW5jZSB0byBUYWJsZUNvbXBvbmVudFxyXG4gICAqIEByZXR1cm5zIHtPYmplY3RbXX0gc29ydGVkIGRhdGFcclxuICAgKi9cclxuICBmdW5jdGlvbiBhcHBseVNvcnRpbmcodGFibGUpe1xyXG4gICAgLy8gaWYoY29sdW1uKSB7XHJcbiAgICAvLyAgIHJldHVybiB0YWJsZS5zb3J0ZWREYXRhLnNvcnQoKGEsIGIpID0+IHtcclxuICAgIC8vICAgICByZXR1cm4gdGFibGUuY3VzdG9tQ2hvb3NlU29ydHNDb21wYXJlRm4odGFibGUsIHRhYmxlLnNvcnRlZERhdGEsIGNvbHVtbikoYVtjb2x1bW5dLCBiW2NvbHVtbl0pXHJcbiAgICAvLyAgIH0pXHJcbiAgICAvLyB9IGVsc2UgXHJcbiAgICBpZih0YWJsZS5zb3J0ZWRCeSAmJiB0YWJsZS5zb3J0ZWRCeS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbHVtbiA9IHRhYmxlLnNvcnRlZEJ5WzBdLmNvbDtcclxuICAgICAgbGV0IHNvcnRlZCA9IHRhYmxlLnNvcnRlZERhdGEuc29ydCgoYSwgYikgPT4ge1xyXG4gICAgICAgIHJldHVybiB0YWJsZS5jdXN0b21DaG9vc2VTb3J0c0NvbXBhcmVGbih0YWJsZSwgdGFibGUuZGF0YSwgY29sdW1uKShhW2NvbHVtbl0sIGJbY29sdW1uXSlcclxuICAgICAgfSlcclxuICAgICAgaWYodGFibGUuc29ydGVkQnlbMF0uZGlyID09PSAnZGVzYycpXHJcbiAgICAgICAgc29ydGVkID0gW10uY29uY2F0KHNvcnRlZC5maWx0ZXIoZW50cnkgPT4gZW50cnlbY29sdW1uXSAhPSB1bmRlZmluZWQgJiYgZW50cnlbY29sdW1uXSAhPT0gJycpLnJldmVyc2UoKSwgc29ydGVkLmZpbHRlcihlbnRyeSA9PiBlbnRyeVtjb2x1bW5dID09IHVuZGVmaW5lZCB8fCBlbnRyeVtjb2x1bW5dID09PSAnJykpO1xyXG4gICAgICByZXR1cm4gc29ydGVkO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHRhYmxlLnNvcnRlZERhdGE7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBhcHBseUZpbHRlcih0YWJsZSwgZGF0YSwgaGVhZGVyLCBmaWx0ZXIsIG9wdGlvbnMpe1xyXG4gICAgaWYob3B0aW9ucy5hY3RpdmUpe1xyXG4gICAgICByZXR1cm4gZGF0YS5maWx0ZXIocm93ID0+IFxyXG4gICAgICAgIGhlYWRlci5tYXAoY29sdW1uID0+IHtcclxuICAgICAgICAgIGlmKGZpbHRlcltjb2x1bW5dKXtcclxuICAgICAgICAgICAgaWYgKHRhYmxlLmFjdGl2ZUZpbHRlck9wZXJhdGlvbnNbY29sdW1uXSA9PSAnJyB8fCB0YWJsZS5hY3RpdmVGaWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0gPT0gdW5kZWZpbmVkKSB0YWJsZS5hY3RpdmVGaWx0ZXJPcGVyYXRpb25zW2NvbHVtbl0gPSB0YWJsZS5maWx0ZXJPcGVyYXRpb25zWzBdLm5hbWU7XHJcbiAgICAgICAgICAgIHJldHVybiB0YWJsZS5maWx0ZXJPcGVyYXRpb25zLmZpbmQob3AgPT4gKG9wLm5hbWUgPT0gdGFibGUuYWN0aXZlRmlsdGVyT3BlcmF0aW9uc1tjb2x1bW5dKSkuZm4oZmlsdGVyW2NvbHVtbl0sIHJvd1tjb2x1bW5dKTtcclxuICAgICAgICAgIH0gZWxzZSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9KS5yZWR1Y2UoKGNvbCwgY3VyKSA9PiAoY29sICYmIGN1ciksIHRydWUpXHJcbiAgICAgIClcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gYXBwbHlGb3JtYXR0ZXIoZGF0YSwgaGVhZGVyLCBmb3JtYXR0ZXIsIG9wdGlvbnMpe1xyXG4gICAgaWYob3B0aW9ucy5hY3RpdmUpe1xyXG4gICAgICAvLyBjb25zb2xlLmxvZyhoZWFkZXIpO1xyXG4gICAgICByZXR1cm4gZGF0YS5tYXAoKHJvdywgcm93TnIsIGRhdGFSZWFkT25seSkgPT4ge1xyXG4gICAgICAgIGxldCBmb3JtYXR0ZWRSb3cgPSByb3c7IFxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGhlYWRlcik7XHJcbiAgICAgICAgaGVhZGVyLmZvckVhY2goY29sdW1uID0+IHtcclxuICAgICAgICAgIGlmKGNvbHVtbiA9PT0gJyNpbmNsdWRlJyAmJiByb3dOciA9PT0gMCl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdpbmNsdWRlIDAnLCByb3csIHJvd1tjb2x1bW5dLCBmb3JtYXR0ZXJbY29sdW1uXSk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYoZm9ybWF0dGVyW2NvbHVtbl0pe1xyXG4gICAgICAgICAgICBmb3JtYXR0ZWRSb3dbY29sdW1uXSA9IGZvcm1hdHRlcltjb2x1bW5dLnJlZHVjZSgoY29sLCBjdXIpID0+IGN1cihjb2wsIHJvd05yLCBkYXRhUmVhZE9ubHkpLCByb3dbY29sdW1uXSkvLy50b1N0cmluZygpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZm9ybWF0dGVkUm93W2NvbHVtbl0gPSByb3dbY29sdW1uXVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmKGNvbHVtbiA9PT0gJyNpbmNsdWRlJyAmJiByb3dOciA9PT0gMCl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdpbmNsdWRlIDAnLCBmb3JtYXR0ZWRSb3cpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFJvdztcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gZGF0YTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGFwcGx5UGFnaW5hdGlvbih0YWJsZSwgZGF0YSl7XHJcbiAgICBsZXQgcmVzdWx0ID0gZGF0YTtcclxuICAgIHRhYmxlLnBhZ2luYXRpb24uYWN0aXZlID0gdGFibGUucGFnaW5hdGlvbk9wdGlvbnMuYWN0aXZlO1xyXG4gICAgdGFibGUucGFnaW5hdGlvbi50b3RhbFBhZ2VzID0gdGFibGUucGFnaW5hdGlvbi5hY3RpdmUgPyBNYXRoLmNlaWwoZGF0YS5sZW5ndGggLyB0YWJsZS5wYWdpbmF0aW9uLnBhZ2VTaXplKSA6IDE7XHJcbiAgICBpZih0YWJsZS5wYWdpbmF0aW9uLnRvdGFsUGFnZXMgPT0gMSl7XHJcbiAgICAgIHRhYmxlLnBhZ2luYXRpb24uYWN0aXZlID0gZmFsc2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXN1bHQgPSBkYXRhLmZpbHRlcigodmFsdWUsIGluZGV4KSA9PiBcclxuICAgICAgICAhdGFibGUucGFnaW5hdGlvbi5hY3RpdmVcclxuICAgICAgICB8fCAoKGluZGV4ID49ICh0YWJsZS5wYWdpbmF0aW9uLmN1cnJlbnRQYWdlIC0gMSkgKiB0YWJsZS5wYWdpbmF0aW9uLnBhZ2VTaXplKSBcclxuICAgICAgICAmJiAoaW5kZXggPCAodGFibGUucGFnaW5hdGlvbi5jdXJyZW50UGFnZSkgKiB0YWJsZS5wYWdpbmF0aW9uLnBhZ2VTaXplKSlcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBkcmF3VGFibGUodGFibGUpe1xyXG4gICAgdGFibGUuZWxlbWVudHMuc29ydEFycm93cyA9IHt9O1xyXG5cclxuICAgIC8vIHRhYmxlLmRhdGEgPSB0YWJsZS5kYXRhLm1hcChlbnRyeSA9PiB7XHJcbiAgICAvLyAgIGxldCB0ZW1wUm93ID0gZW50cnk7XHJcbiAgICAvLyAgIGRlbGV0ZSB0ZW1wUm93WycjaW5jbHVkZSddO1xyXG4gICAgLy8gICByZXR1cm4geycjaW5jbHVkZSc6IHRhYmxlLm9wdGlvbnMudGlja2VkUm93cy5pbmNsdWRlcyhKU09OLnN0cmluZ2lmeSh0ZW1wUm93KSkgPyAneCcgOiAnJywgLi4udGVtcFJvd307XHJcbiAgICAvLyB9KTtcclxuICAgIFxyXG5cclxuICAgIHRhYmxlLmRyYXdPcHRpb25hbHMgPSB7XHJcbiAgICAgIGhlYWRlcjogIXRhYmxlLmhhc0F0dHJpYnV0ZSgnbm9oZWFkZXInKSxcclxuICAgICAgZmlsdGVyOiAhdGFibGUuaGFzQXR0cmlidXRlKCdub2ZpbHRlcicpLCAvLyEgVE9ETyBmaXggQnJva2VuIG5vZmlsdGVyXHJcbiAgICAgIGZvb3RlcjogIXRhYmxlLmhhc0F0dHJpYnV0ZSgnbm9mb290ZXInKSxcclxuICAgICAgcGFnZWtleTogIXRhYmxlLmhhc0F0dHJpYnV0ZSgnbm9wYWdla2V5JyksXHJcbiAgICAgIHJld3JpdGV1cmw6ICF0YWJsZS5oYXNBdHRyaWJ1dGUoJ25vcmV3cml0ZXVybCcpLFxyXG4gICAgfVxyXG4gICAgXHJcbiAgICB0YWJsZS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgaWYoIXRhYmxlLmRhdGEpIHRhYmxlLmRhdGEgPSBbXTsgICAgICBcclxuICAgIGlmKCF0YWJsZS5zb3J0ZWREYXRhKSB0YWJsZS5zb3J0ZWREYXRhID0gdGFibGUuZGF0YS5tYXAodmFsdWUgPT4gdmFsdWUpO1xyXG5cclxuICAgIGlmKCF0YWJsZS5oZWFkZXJBbGwgJiYgdGFibGUuZGF0YS5sZW5ndGggPiAwKXtcclxuICAgICAgbGV0IGdlbkhlYWRlciA9IGdlbmVyYXRlSGVhZGVyKHRhYmxlLmRhdGEpO1xyXG4gICAgICBjb25zb2xlLmxvZygnZ2VuaGVhZGVyJywgZ2VuSGVhZGVyKTtcclxuICAgICAgLy8gaWYoIWdlbkhlYWRlci5pbmNsdWRlcygnI2luY2x1ZGUnKSkgdGFibGUuaGVhZGVyQWxsID0gWycjaW5jbHVkZSddLmNvbmNhdChnZW5IZWFkZXIpO1xyXG4gICAgICB0YWJsZS5oZWFkZXJBbGwgPSBnZW5IZWFkZXI7XHJcblxyXG4gICAgICBcclxuICAgICAgdGFibGUuaGlkZGVuQ29sdW1ucyA9IHRhYmxlLmhpZGRlbkNvbHVtbnMuY29uY2F0KHRhYmxlLmhlYWRlckFsbC5maWx0ZXIoY29sdW1uID0+XHJcbiAgICAgICAgdGFibGUuaGlkZGVuQ29sdW1uc0NvbmRpdGlvblxyXG4gICAgICAgICAgLm1hcChjb25kaXRpb24gPT4gKHtjb2w6IGNvbHVtbiwgaGlkZGVuOiBjb25kaXRpb24oY29sdW1uLCB0YWJsZS5kYXRhKX0pKVxyXG4gICAgICAgICAgLmZpbHRlcihjb2x1bW5Db25kID0+IGNvbHVtbkNvbmQuaGlkZGVuKVxyXG4gICAgICAgICAgLm1hcChjb2x1bW5Db25kID0+IGNvbHVtbkNvbmQuY29sKVxyXG4gICAgICAgICAgLmluY2x1ZGVzKGNvbHVtbilcclxuICAgICAgKSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYodGFibGUuaGVhZGVyQWxsICYmIHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJDaGVja2JveCkge1xyXG4gICAgICBmb3IobGV0IGNvbHVtbiBvZiB0YWJsZS5oZWFkZXJBbGwpe1xyXG4gICAgICAgIGlmKHRhYmxlLmhpZGRlbkNvbHVtbnMuaW5jbHVkZXMoY29sdW1uKSAmJiAhdGFibGUudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoY29sdW1uKSl7XHJcbiAgICAgICAgICB0YWJsZS5lbGVtZW50cy5jb2x1bW5DaG9vc2VyQ2hlY2tib3hbY29sdW1uXS5jaGVja2VkID0gZmFsc2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRhYmxlLmVsZW1lbnRzLmNvbHVtbkNob29zZXJDaGVja2JveFtjb2x1bW5dLmNoZWNrZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKCdoaWRkZW4gY29sdW1ucycsIHRhYmxlLmhpZGRlbkNvbHVtbnMpO1xyXG5cclxuICAgIGlmKHRhYmxlLmhlYWRlckFsbCl7XHJcbiAgICAgIHRhYmxlLmhlYWRlciA9IFxyXG4gICAgICAgIHRhYmxlLmhlYWRlckFsbC5maWx0ZXIoY29sdW1uID0+IFxyXG4gICAgICAgICAgIXRhYmxlLmhpZGRlbkNvbHVtbnMuaW5jbHVkZXMoY29sdW1uKSB8fCB0YWJsZS52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhjb2x1bW4pXHJcbiAgICAgICAgKVxyXG4gICAgICB0YWJsZS5zdHlsZS5ncmlkVGVtcGxhdGVDb2x1bW5zID0gYHJlcGVhdCgke3RhYmxlLmhlYWRlci5sZW5ndGh9LCBtYXgtY29udGVudClgO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKHRhYmxlLmRyYXdPcHRpb25hbHMuaGVhZGVyICYmIHRhYmxlLmhlYWRlcil7XHJcbiAgICAgIGNyZWF0ZUhlYWRlcih0YWJsZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmKHRhYmxlLmRyYXdPcHRpb25hbHMuZmlsdGVyICYmIHRhYmxlLmhlYWRlcil7XHJcbiAgICAgIGNyZWF0ZUZpbHRlcih0YWJsZSwgdGFibGUuaGVhZGVyLCB0YWJsZS5maWx0ZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0YWJsZS5kYXRhLmxlbmd0aCA+IDApe1xyXG4gICAgICAvLyB0YWJsZS5kYXRhID0gdGFibGUuZGF0YTtcclxuICAgICAgdGFibGUuZGlzcGxheWVkRGF0YSA9IGRyYXdEYXRhKHRhYmxlKTtcclxuXHJcbiAgICAgIC8vPyBMb2csIHRoYXQgaXMgc2VuZCB0byBUcmFja2VyIFNlcnZlcjpcclxuICAgICAgY29uc29sZS5sb2coJ0ZpbmlzaGVkIHRyYW5zZm9ybSBvZiBkYXRhLicsIHRhYmxlLmRpc3BsYXllZERhdGEsIGFwcG5hbWUpO1xyXG5cclxuICAgICAgdGFibGUuZWxlbWVudHMucGFnZUNob29zZXIgPSBjcmVhdGVQYWdlQ2hvb3Nlcih0YWJsZSwgdGFibGUuZGlzcGxheWVkRGF0YSk7XHJcblxyXG4gICAgICBpZiAodGFibGUuZHJhd09wdGlvbmFscy5mb290ZXIpIGNyZWF0ZUZvb3Rlcih0YWJsZSwgdGFibGUuZGlzcGxheWVkRGF0YSwgdGFibGUuZWxlbWVudHMucGFnZUNob29zZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0YWJsZS5kcmF3T3B0aW9uYWxzLnBhZ2VrZXkpe1xyXG4gICAgICBhZGRLZXlIYW5kbGVyVG9Eb2N1bWVudCh0YWJsZSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBkcmF3RGF0YSh0YWJsZSl7XHJcbiAgICB0YWJsZS5zb3J0ZWREYXRhID0gYXBwbHlTb3J0aW5nKHRhYmxlKTtcclxuICAgIGFwcGx5Q29uZGl0aW9uYWxDb2x1bW5TdHlsaW5nKHRhYmxlLCB0YWJsZS5zb3J0ZWREYXRhLCB0YWJsZS5oZWFkZXIsIHRhYmxlLmNvbmRpdGlvbmFsQ29sdW1uU3R5bGUsIHRhYmxlLmNvbmRpdGlvbmFsU3R5bGVPcHRpb25zKTtcclxuICAgIGNvbnNvbGUubG9nKCdzb3J0ZWQgZGF0YScsIHRhYmxlLnNvcnRlZERhdGEpO1xyXG4gICAgY29uc29sZS5sb2coJ2hlYWRlcicsIHRhYmxlLmhlYWRlcik7XHJcbiAgICBsZXQgZm9ybWF0dGVkRGF0YSA9IGFwcGx5Rm9ybWF0dGVyKHRhYmxlLnNvcnRlZERhdGEsIHRhYmxlLmhlYWRlciwgdGFibGUuZm9ybWF0dGVyLCB0YWJsZS5mb3JtYXR0ZXJPcHRpb25zKTtcclxuICAgIGNvbnNvbGUubG9nKCdmb3JtYXR0ZWQgZGF0YScsIGZvcm1hdHRlZERhdGEpO1xyXG4gICAgbGV0IGZpbHRlcmVkRGF0YSA9IGFwcGx5RmlsdGVyKHRhYmxlLCBmb3JtYXR0ZWREYXRhLCB0YWJsZS5oZWFkZXIsIHRhYmxlLmZpbHRlciwgdGFibGUuZmlsdGVyT3B0aW9ucyk7XHJcbiAgICBjb25zb2xlLmxvZygnZmlsdGVyZWQgZGF0YScsIGZpbHRlcmVkRGF0YSk7XHJcbiAgICB0YWJsZS5wYWdpbmF0aW9uLmZpbHRlcmVkRGF0YUNvdW50ID0gZmlsdGVyZWREYXRhLmxlbmd0aDtcclxuICAgIGxldCBwYWdlaW5hdGVkRGF0YSA9IGFwcGx5UGFnaW5hdGlvbih0YWJsZSwgZmlsdGVyZWREYXRhKTtcclxuICAgIGNvbnNvbGUubG9nKCdwYWdpbmF0ZWQgZGF0YScsIHBhZ2VpbmF0ZWREYXRhKTtcclxuICAgIC8vIHBhZ2VpbmF0ZWREYXRhID0gcGFnZWluYXRlZERhdGEubWFwKGVudHJ5ID0+ICh7JyNpbmNsdWRlJzogdGFibGUudGlja2VkUm93cy5pbmNsdWRlcyhKU09OLnN0cmluZ2lmeShlbnRyeSkpID8gJ3gnIDogJycsIC4uLmVudHJ5fSkpXHJcbiAgICB0YWJsZS5zdHlsZS5ncmlkVGVtcGxhdGVSb3dzID0gYCR7XHJcbiAgICAgIHRhYmxlLmRyYXdPcHRpb25hbHMuaGVhZGVyID8gJ21heC1jb250ZW50JyA6ICcnfSAke1xyXG4gICAgICAgIHRhYmxlLmRyYXdPcHRpb25hbHMuZmlsdGVyID8gJ21heC1jb250ZW50JyA6ICcnfSByZXBlYXQoJHtwYWdlaW5hdGVkRGF0YS5sZW5ndGh9LCBtYXgtY29udGVudCkgJHtcclxuICAgICAgICAgIHRhYmxlLmRyYXdPcHRpb25hbHMuZm9vdGVyID8gJ21heC1jb250ZW50JyA6ICcnfWA7IFxyXG4gICAgZmlsbERhdGEodGFibGUsIHBhZ2VpbmF0ZWREYXRhKTtcclxuICAgIGFwcGx5Q29uZGl0aW9uYWxSb3dTdHlsaW5nKHRhYmxlLCBwYWdlaW5hdGVkRGF0YSwgdGFibGUuaGVhZGVyLCB0YWJsZS5jb25kaXRpb25hbFJvd1N0eWxlLCB0YWJsZS5jb25kaXRpb25hbFN0eWxlT3B0aW9ucyk7XHJcbiAgICByZXR1cm4gcGFnZWluYXRlZERhdGE7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBkZWZpbmVIaWRkZW5Qcm9wZXJ0aWVzKHRhYmxlLCBwcm9wcyl7XHJcbiAgICBwcm9wcy5mb3JFYWNoKHByb3AgPT4gT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhYmxlLCBwcm9wLCB7XHJcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxyXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcclxuICAgICAgLy8gY29uZmlndXJhYmxlOiB0cnVlLFxyXG4gICAgfSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBkZWZpbmVPcHRpb25Qcm9wZXJ0aWVzKHRhYmxlLCBwcm9wcyl7XHJcbiAgICBwcm9wcy5mb3JFYWNoKHByb3AgPT4gXHJcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YWJsZSwgcHJvcCwge1xyXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgd3JpdGFibGU6IHRydWVcclxuICAgICAgfSlcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBjb25zdCBmdW5SZWdleCA9IC9eKCg/OmZ1bmN0aW9uXFxzKi4qKXswLDF9XFwoKFteXFwoXFx7XFxbXFw9XFw+XSopXFwpXFxzKig/Oj0+fFxceylcXHMqW1xce1xcKF17MCwxfS4qW1xcfVxcKV17MCwxfSkkL2d5O1xyXG5cclxuICBmdW5jdGlvbiBkZXNlcmlhbGl6ZUZ1bmN0aW9uKGZ1blN0cil7XHJcbiAgICBsZXQgbWF0Y2ggPSBmdW5SZWdleC5leGVjKGZ1blN0cik7XHJcbiAgICBsZXQgYXJncyA9IG1hdGNoLmdyb3Vwc1syXS5zcGxpdCgnLCcpLm1hcChzdHIgPT4gc3RyLnRyaW0oKSlcclxuICAgIHJldHVybiBuZXcgRnVuY3Rpb24oLi4uYXJncywgYHJldHVybiAoJHtmdW5TdHIudG9TdHJpbmcoKX0pKCR7YXJncy5qb2luKCcsICcpfSlgKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2VyaWFsaXplRnVuY3Rpb24oZnVuKXtcclxuICAgIHJldHVybiBmdW4udG9TdHJpbmcoKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHJlcGxhY2VVcmxTZWFyY2hQYXJhbWV0ZXIobmV3UGFyYW1LZXksIG5ld1BhcmFtVmFsdWUpe1xyXG4gICAgbGV0IHJlc3VsdCA9ICc/JztcclxuICAgIGxldCByZXBsYWNlZCA9IGZhbHNlO1xyXG4gICAgbGV0IG9sZFBhcmFtcyA9IGxvY2F0aW9uLnNlYXJjaC5zbGljZSgxKS5zcGxpdCgnJicpXHJcbiAgICBpZihvbGRQYXJhbXMubGVuZ3RoID4gMSl7XHJcbiAgICAgIG9sZFBhcmFtcy5mb3JFYWNoKG9sZFBhcmFtID0+IHtcclxuICAgICAgICBsZXQgb2xkUGFyYW1LZXkgPSBvbGRQYXJhbS5zcGxpdCgnPScpWzBdO1xyXG4gICAgICAgIGlmKG9sZFBhcmFtS2V5ID09IG5ld1BhcmFtS2V5KSB7XHJcbiAgICAgICAgICByZXBsYWNlZCA9IHRydWU7XHJcbiAgICAgICAgICByZXN1bHQgKz0gYCR7b2xkUGFyYW1LZXl9PSR7bmV3UGFyYW1WYWx1ZX0mYDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSByZXN1bHQgKz0gYCR7b2xkUGFyYW1LZXl9PSR7b2xkUGFyYW0uc3BsaXQoJz0nKS5zbGljZSgxKS5qb2luKCc9Jyl9JmA7XHJcbiAgICAgIH0pXHJcbiAgICB9IGVsc2UgaWYob2xkUGFyYW1zLmxlbmd0aCA9PSAxKXtcclxuICAgICAgaWYgKG9sZFBhcmFtc1swXSA9PSBcIlwiKXtcclxuICAgICAgICByZXBsYWNlZCA9IHRydWU7XHJcbiAgICAgICAgcmVzdWx0ICs9IGAke25ld1BhcmFtS2V5fT0ke25ld1BhcmFtVmFsdWV9JmA7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKG9sZFBhcmFtc1swXS5zcGxpdCgnPScpWzBdID09IG5ld1BhcmFtS2V5KXtcclxuICAgICAgICAgIHJlcGxhY2VkID0gdHJ1ZTtcclxuICAgICAgICAgIHJlc3VsdCArPSBgJHtuZXdQYXJhbUtleX09JHtuZXdQYXJhbVZhbHVlfSZgO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXN1bHQgKz0gYCR7b2xkUGFyYW1zWzBdLnNwbGl0KCc9JylbMF19PSR7b2xkUGFyYW1zWzBdLnNwbGl0KCc9Jykuc2xpY2UoMSkuam9pbignPScpfSZgO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKCFyZXBsYWNlZCkgcmVzdWx0ICs9IGAke25ld1BhcmFtS2V5fT0ke25ld1BhcmFtVmFsdWV9JmA7XHJcbiAgICByZXR1cm4gcmVzdWx0LnNsaWNlKDAsIC0xKSArIGxvY2F0aW9uLmhhc2g7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiByZWFwcGx5U29ydGluZyh0YWJsZSwgcGFydGlhbE9wdGlvbnMpe1xyXG4gICAgY29uc29sZS5sb2coJ3JlYXBseSBzb3J0aW5nJylcclxuICAgIHJlc2V0U29ydGluZyh0YWJsZSk7XHJcbiAgICBwYXJ0aWFsT3B0aW9uc1snc29ydGVkQnknXS5yZXZlcnNlKCkuc2xpY2UoLTQpLmZvckVhY2goc29ydFN0ZXAgPT4ge1xyXG4gICAgICBpZihzb3J0U3RlcC5kaXIgPT0gJ2Rlc2MnKXtcclxuICAgICAgICBvblNvcnRDbGljayh0YWJsZSwgc29ydFN0ZXAuY29sKVxyXG4gICAgICB9XHJcbiAgICAgIG9uU29ydENsaWNrKHRhYmxlLCBzb3J0U3RlcC5jb2wpXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVGFibGVDb21wb25lbnQgaXMgdGhlIGltcGxlbWVudGF0aW9uIG9mIHdjLWdyaWQtdGFibGUgKHNob3J0OiB3Z3QpLlxyXG4gICAqIFxyXG4gICAqIFRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIGFyZSBleHBvc2VkIHdoZW4gY3JlYXRpbmcgYSB3Z3QgSFRNTCBlbGVtZW50IChkb2N1bWVudGVkIGluIHRoZXJlIHJlc3BlY3RpdmUgZG9jc3RyaW5nKTpcclxuICAgKiAgLSB1c2VEZWZhdWx0T3B0aW9ucygpXHJcbiAgICogIC0gY29ubmVjdGVkQ2FsbGJhY2soKVxyXG4gICAqICAtIHNldERlYm91bmNlRm4oZGVib3VuY2VGbiwgc29ydERlYm91bmNlT3B0aW9ucywgZmlsdGVyRGVib3VuY2VkT3B0aW9ucylcclxuICAgKiAgLSBzZXREYXRhKGRhdGEpXHJcbiAgICogIC0gZ2V0RGlzcGxheWVkRGF0YSgpXHJcbiAgICogIC0gZ2V0T3JpZ2luYWxEYXRhKClcclxuICAgKiAgLSByZWRyYXdEYXRhKClcclxuICAgKiBcclxuICAgKiBUaGUgZm9sbG93aW5nIHByb3BlcnRpZXMgY2FuIGJlIGFjY2Vzc2VkIGRpcmVjdGx5OlxyXG4gICAqICAtIHJvb3RfZG9jdW1lbnQgLSBlaXRoZXIgZG9jdW1lbnQgb3IgdGhlIGNvbm5lY3RlZCBzaGFkb3dSb290XHJcbiAgICogIC0gY29uZGl0aW9uYWxDb2x1bW5TdHlsZSAtIGFuIG9iamVjdCB3aXRoIGtleXMgW1wiY29uZGl0aW9uXCIsIFwic3R5bGVzXCJdIHdoZXJlIGNvbmRpdGlvbiBpcyBhIGZ1bmN0aW9uIFwiKGRhdGEgOiBBcnJheTxPYmplY3Q+ICwgY29sdW1uIDogc3RyaW5nKSA9PiBCb29sZWFuXCIgYW5kIHN0eWxlcyBpc1xyXG4gICAqICAgIGFuIEFycmF5IG9mIHN0cmluZ3Mgd2l0aCBzdHlsZXMsIHRoYXQgc2hvdWxkIGFwcGx5IHdoZW4gXCJjb25kaXRpb25cIiByZXR1cm5zIHRydWUgZm9yIGEgY29sdW1uLlxyXG4gICAqICAgIENhbiBiZSB1c2VkIHRvIHN0eWxlIGEgY29sdW1uIGluIGRlcGVuZGVuY3kgb2YgdGhlaXIgZGF0YS4gXHJcbiAgICogIC0gY29uZGl0aW9uYWxTdHlsZU9wdGlvbnMgLSBhbiBvYmplY3Qgd2l0aCBvcHRpb25zIGNvbmNlcm5pbmcgY29uZGl0aW9uYWxDb2x1bW5TdHlsZSBhbmQgY29uZGl0aW9uYWxSb3dTdHlsZS4gQXZhaWxhYmxlIE9wdGlvbnM6XHJcbiAgICogICAgICAtIGFjdGl2ZTogQm9vbGVhblxyXG4gICAqICAtIGZvcm1hdHRlciAtIGFuIE9iamVjdCB3aXRoIGNvbHVtbiBuYW1lcyBhcyBrZXlzLCBjb250YWluaW5nIGxpc3RzIG9mIGZvcm1hdHRlciBmdW5jdGlvbnMsIHRoYXQgc2hvdWxkIGJlIGFwcGxpZWQgYmVmb3JlIGRpc3BsYWluZyBhIHRhYmxlIHZhbHVlLiBGb3JtYXR0ZXIgZnVuY3Rpb25zXHJcbiAgICogICAgaGF2ZSB0aGlzIHNpZ25hdHVyZTogXCIodmFsdWUsIHJvd0luZGV4LCBjb21wbGV0ZURhdGEpID0+IGFueVwiLiBGb3JtYXR0ZXIgZ2V0IGFwcGxpZWQgaW4gdGhlIHNlcXVlbmNlIHRoZXkgYXJlIGluIHRoZSBsaXN0IChsZWZ0bW9zdCBmdW5jdGlvbiAoMm5kIGZyb20gbGVmdCAoM3JkIC4uLikpKS5cclxuICAgKiAgLSBmb3JtYXR0ZXJPcHRpb25zIC0gYW4gb2JqZWN0IHdpdGggb3B0aW9ucyBjb25jZXJuaW5nIGZvcm1hdHRlci4gQXZhaWxhYmxlIE9wdGlvbnM6XHJcbiAgICogICAgICAtIGFjdGl2ZTogQm9vbGVhblxyXG4gICAqICAtIGZpbHRlciAtIGFuIE9iamVjdCB3aXRoIGNvbHVtbiBuYW1lcyBhcyBrZXlzLCBjb250YWluaW5nIHN0cmluZ3Mgd2hpY2ggY29ycmVzcG9uZCB0byB0aGUgZmlsdGVyIGlucHV0IHZhbHVlcyBpbiB0aGUgdWkuIFxyXG4gICAqICAgIFRob3NlIGdldCB2YWxpZGF0ZWQgYnkgZmlsdGVyT3BlcmF0aW9ucy5mbi5cclxuICAgKiAgLSBmaWx0ZXJPcHRpb25zIC0gYW4gb2JqZWN0IHdpdGggb3B0aW9ucyBjb25jZXJuaW5nIGZpbHRlci4gQXZhaWxhYmxlIE9wdGlvbnM6XHJcbiAgICogICAgICAtIGFjdGl2ZTogQm9vbGVhblxyXG4gICAqICAtIGZpbHRlck9wZXJhdGlvbnMgLSBhbiBvYmplY3Qgd2l0aCBvcGVyYXRpb25zLCBmaWx0ZXJzIGFuZCBjaGFycyBmb3IgZGlmZmVyZW50IGZpbHRlciBvcHRpb25zIHRvZ2dsZWFibGUuIGB7Q29sdW1uMToge25hbWU6ICdtb2RGaWx0ZXInLCBjaGFyOiAnJScsIGZuOiBmdW5jdGlvbihmaWx0ZXJJbnB1dCwgdGVzdFZhbHVlKX19YFxyXG4gICAqICAtIHNvcnRlZEJ5IC0gYW4gQXJyYXkgb2YgT2JqZWN0cyBkZXNjcmliaW5nIHNvcnRpbmcuIEtleXMgYXJlIGNvbCAtIGNvbHVtbiBuYW1lIHNvcnRlZCAtIGFuZCBkaXIgLSB0aGUgc29ydCBkaXJlY3Rpb24gKG9uZSBvZiBbXCJhc2NcIiwgXCJkZXNjXCJdKS4gU29ydGluZyBpcyBrZXB0IGFmdGVyIGVhY2hcclxuICAgKiAgICBzb3J0aW5nIG9wZXJhdGlvbiwgc28gdGhhdCBwcmltYXJ5LCBzZWNvbmRhcnksIHRlcnRpYXJ5LCAuLi4gc29ydGluZyBpcyBwb3NzaWJsZS5cclxuICAgKiAgLSBzb3J0T3B0aW9ucyAtIGFuIG9iamVjdCB3aXRoIG9wdGlvbnMgY29uY2VybmluZyBzb3J0aW5nLiBBdmFpbGFibGUgT3B0aW9uczpcclxuICAgKiAgICAgIC0gYWN0aXZlOiBCb29sZWFuXHJcbiAgICogIC0gY3VzdG9tQ2hvb3NlU29ydHNDb21wYXJlRm4gLSBhIGZ1bmN0aW9uIG1hcHMgY29sdW1ucyB0byBzb3J0aW5nIGJlaGF2aW9yLiBFeHBlY3RlZCByZXR1cm4gZm9yIGdpdmVuICh0YWJsZTogVGFibGVDb21wb25lbnQgaW5zdGFuY2UsIGRhdGE6IEFycmF5PE9iamVjdD4sIGNvbHVtbjogc3RyaW5nKVxyXG4gICAqICAgIGlzIGEgZnVuY3Rpb24gdG8gY29tcGFyZSB0aGUgdmFsdWVzIG9mIHRoaXMgY29sdW1uLlxyXG4gICAqICAtIGN1c3RvbUNvbXBhcmVOdW1iZXJzIC8gY3VzdG9tQ29tcGFyZVRleHQgLSBmdW5jdGlvbnMgdG8gcmVwbGFjZSBkZWZhdWx0IHNvcnQgYmVoYXZpb3IgY29ycmVzcG9uaW5nIHRvIHNvcnRpbmcgbnVtYmVycyAvIHRleHQuIExpa2UgZGVmYXVsdCBqcyBDb21wYXJlRm4gdXNlZCBpbiBBcnJheS5wcm90b3R5cGUuc29ydFxyXG4gICAqL1xyXG4gIGNsYXNzIFRhYmxlQ29tcG9uZW50IGV4dGVuZHMgSFRNTEVsZW1lbnR7XHJcbiAgICBjb25zdHJ1Y3Rvcigpe1xyXG4gICAgICBzdXBlcigpO1xyXG5cclxuICAgICAgZGVmaW5lU2V0UHJvdG90eXBlRnVuY3Rpb25zKCk7XHJcblxyXG4gICAgICB0aGlzLmxpbmtPcHRpb25zID0gW1xyXG4gICAgICAgICdwYWdpbmF0aW9uJyxcclxuICAgICAgICAnZmlsdGVyJyxcclxuICAgICAgICAnc29ydGVkQnknLFxyXG4gICAgICAgICdhY3RpdmVGaWx0ZXJPcGVyYXRpb25zJyxcclxuICAgICAgICAnaGlkZGVuQ29sdW1ucycsXHJcbiAgICAgICAgJ3Zpc2libGVDb2x1bW5zJyxcclxuICAgICAgICAvLyAndGlja2VkUm93cycsXHJcbiAgICAgIF1cclxuXHJcbiAgICAgIGRlZmluZUhpZGRlblByb3BlcnRpZXModGhpcywgW1xyXG4gICAgICAgICdvcHRpb25zJyxcclxuICAgICAgICAncm9vdF9kb2N1bWVudCcsXHJcbiAgICAgICAgJ29wdGlvbmFsRGVib3VuY2VGbicsXHJcbiAgICAgICAgJ3NvcnRlZERhdGEnLFxyXG4gICAgICAgICdkYXRhJyxcclxuICAgICAgICAnaGVhZGVyJyxcclxuICAgICAgICAnZGlzcGxheWVkRGF0YScsXHJcbiAgICAgICAgJ2RyYXdPcHRpb25hbHMnLFxyXG4gICAgICAgICdlbGVtZW50cycsXHJcbiAgICAgICAgJ3RhYmxlSWQnLFxyXG4gICAgICBdKTtcclxuXHJcbiAgICAgIHRoaXMub3B0aW9ucyA9IHt9XHJcblxyXG4gICAgICBkZWZpbmVPcHRpb25Qcm9wZXJ0aWVzKHRoaXMsIFtcclxuICAgICAgICAnY29uZGl0aW9uYWxDb2x1bW5TdHlsZScsXHJcbiAgICAgICAgJ2NvbmRpdGlvbmFsUm93U3R5bGUnLFxyXG4gICAgICAgICdjb25kaXRpb25hbFN0eWxlT3B0aW9ucycsXHJcbiAgICAgICAgJ2Zvcm1hdHRlcicsXHJcbiAgICAgICAgJ2Zvcm1hdHRlck9wdGlvbnMnLFxyXG4gICAgICAgICdmaWx0ZXInLFxyXG4gICAgICAgICdmaWx0ZXJPcHRpb25zJyxcclxuICAgICAgICAnZmlsdGVyT3BlcmF0aW9ucycsXHJcbiAgICAgICAgJ2FjdGl2ZUZpbHRlck9wZXJhdGlvbnMnLFxyXG4gICAgICAgICdzb3J0ZWRCeScsXHJcbiAgICAgICAgJ3NvcnRPcHRpb25zJyxcclxuICAgICAgICAncGFnaW5hdGlvbicsXHJcbiAgICAgICAgJ2N1c3RvbUNvbXBhcmVOdW1iZXJzJyxcclxuICAgICAgICAnY3VzdG9tQ29tcGFyZVRleHQnLFxyXG4gICAgICAgICdjdXN0b21DaG9vc2VTb3J0c0NvbXBhcmVGbicsXHJcbiAgICAgICAgJ2hpZGRlbkNvbHVtbnMnLFxyXG4gICAgICAgICdoaWRkZW5Db2x1bW5zQ29uZGl0aW9uJyxcclxuICAgICAgICAndmlzaWJsZUNvbHVtbnMnLFxyXG4gICAgICAgICd0aWNrZWRSb3dzJyxcclxuICAgICAgXSk7XHJcblxyXG4gICAgICB0aGlzLnVzZURlZmF1bHRPcHRpb25zKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXNldCBPcHRpb25zIHRvIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24uXHJcbiAgICAgKi9cclxuICAgIHVzZURlZmF1bHRPcHRpb25zKCl7XHJcbiAgICAgIHRoaXMucm9vdF9kb2N1bWVudCA9IGRvY3VtZW50O1xyXG5cclxuICAgICAgdGhpcy5lbGVtZW50cyA9IHt9O1xyXG5cclxuICAgICAgLy8gdGhpcy50YWJsZUlkID0gMDtcclxuICAgICAgdGhpcy50YWJsZUlkID0gdGFibGVDb3VudGVyKys7XHJcblxyXG4gICAgICB0aGlzLmRhdGEgPSBbXTtcclxuICAgICAgXHJcbiAgICAgIHRoaXMuaGlkZGVuQ29sdW1ucyA9IFtdOyAvLyBbJ0VpbnplbHByZWlzJ107XHJcbiAgICAgIHRoaXMudmlzaWJsZUNvbHVtbnMgPSBbXTtcclxuICAgICAgdGhpcy5oaWRkZW5Db2x1bW5zQ29uZGl0aW9uID0gW1xyXG4gICAgICAgIChjb2x1bW4sIGRhdGEpID0+IChjb2x1bW4uc3RhcnRzV2l0aCgnIycpKSxcclxuICAgICAgXTtcclxuXHJcbiAgICAgIHRoaXMuZWxlbWVudHMuc29ydEFycm93cyA9IHt9O1xyXG4gICAgICB0aGlzLm9wdGlvbmFsRGVib3VuY2VGbiA9IHVuZGVmaW5lZDtcclxuICAgICAgdGhpcy5hY3RpdmVGaWx0ZXJPcGVyYXRpb25zID0ge307XHJcblxyXG4gICAgICB0aGlzLnBhZ2luYXRpb25PcHRpb25zID0ge1xyXG4gICAgICAgIGFjdGl2ZTogdHJ1ZSxcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5wYWdpbmF0aW9uID0ge1xyXG4gICAgICAgIGFjdGl2ZTogdHJ1ZSxcclxuICAgICAgICBjdXJyZW50UGFnZTogMSxcclxuICAgICAgICBwYWdlU2l6ZTogNDAsXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZmlsdGVyT3BlcmF0aW9ucyA9IFtcclxuICAgICAgICB7bmFtZTogJ2NvbnRhaW5zRXgnLCBjaGFyOiAnJnN1YmU7JywgZm46IHJlZ2V4RmlsdGVyLmJpbmQobnVsbCwgZmFsc2UpfSwgXHJcbiAgICAgICAge25hbWU6ICdub3RDb250YWluc0V4JywgY2hhcjogJyYjODg0MDsnLCBmbjogcmVnZXhGaWx0ZXIuYmluZChudWxsLCB0cnVlKX0sIFxyXG4gICAgICAgIHtuYW1lOiAnZXF1YWxzJywgY2hhcjogJz0nLCBmbjogY29tcGFyZUZpbHRlci5iaW5kKG51bGwsIChhLCBiKSA9PiBhID09IGIpfSwgXHJcbiAgICAgICAge25hbWU6ICdncmVhdGVyJywgY2hhcjogJz4nLCBmbjogY29tcGFyZUZpbHRlci5iaW5kKG51bGwsIChhLCBiKSA9PiBhIDwgYil9LCBcclxuICAgICAgICB7bmFtZTogJ2dyZWF0ZXJFcXVhbHMnLCBjaGFyOiAnJmdlOycsIGZuOiBjb21wYXJlRmlsdGVyLmJpbmQobnVsbCwgKGEsIGIpID0+IGEgPD0gYil9LCBcclxuICAgICAgICB7bmFtZTogJ2xlc3NlcicsIGNoYXI6ICc8JywgZm46IGNvbXBhcmVGaWx0ZXIuYmluZChudWxsLCAoYSwgYikgPT4gYSA+IGIpfSwgXHJcbiAgICAgICAge25hbWU6ICdsZXNzZXJFcXVhbHMnLCBjaGFyOiAnJmxlOycsIGZuOiBjb21wYXJlRmlsdGVyLmJpbmQobnVsbCwgKGEsIGIpID0+IGEgPj0gYil9LCBcclxuICAgICAgICB7bmFtZTogJ3VuRXF1YWxzJywgY2hhcjogJyZuZTsnLCBmbjogY29tcGFyZUZpbHRlci5iaW5kKG51bGwsIChhLCBiKSA9PiBhICE9IGIpfSwgXHJcbiAgICAgIF1cclxuXHJcbiAgICAgIHRoaXMuY29uZGl0aW9uYWxDb2x1bW5TdHlsZSA9IFtdOyAvKltcclxuICAgICAgICB7XHJcbiAgICAgICAgICBjb25kaXRpb246IChkYXRhLCBjb2x1bW4pID0+ICghTnVtYmVyLmlzTmFOKGRhdGEucmVkdWNlKChjb2wsIGN1cikgPT4gKGNvbCArPSB0eXBlb2YgY3VyW2NvbHVtbl0gPT09IFwic3RyaW5nXCIgPyBOYU4gOiAoY3VyW2NvbHVtbl0gIT0gdW5kZWZpbmVkID8gY3VyW2NvbHVtbl0gOiAwKSksIDApKSksXHJcbiAgICAgICAgICBzdHlsZXM6IFtcInRleHQtYWxpZ246IHJpZ2h0O1wiXVxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0qL1xyXG5cclxuICAgICAgdGhpcy5jb25kaXRpb25hbFJvd1N0eWxlID0ge1xyXG4gICAgICAgLyogUmFiYXR0c2F0ejogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBjb25kaXRpb246IGZ1bmN0aW9uKHZhbHVlLCBpbmRleCl7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlID09IDAgJiYgaW5kZXggJSAyICE9IDA7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0eWxlczogW1wiYmFja2dyb3VuZC1jb2xvcjogbGlnaHRjb3JhbDtcIiwgXCJjb2xvcjogYmxhY2s7XCJdLFxyXG4gICAgICAgICAgICBmdWxscm93OiB0cnVlXHJcbiAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGNvbmRpdGlvbjogZnVuY3Rpb24odmFsdWUsIGluZGV4KXtcclxuICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPT0gMCAmJiBpbmRleCAlIDIgPT0gMDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3R5bGVzOiBbXCJiYWNrZ3JvdW5kLWNvbG9yOiBkYXJrc2FsbW9uO1wiLCBcImNvbG9yOiBibGFjaztcIl0sXHJcbiAgICAgICAgICAgIGZ1bGxyb3c6IHRydWVcclxuICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgY29uZGl0aW9uOiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpe1xyXG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+IDAgJiYgaW5kZXggJSAyICE9IDA7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0eWxlczogW1wiYmFja2dyb3VuZC1jb2xvcjogbGlnaHRncmVlbjtcIiwgXCJjb2xvcjogYmxhY2s7XCJdLFxyXG4gICAgICAgICAgICBmdWxscm93OiB0cnVlXHJcbiAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGNvbmRpdGlvbjogZnVuY3Rpb24odmFsdWUsIGluZGV4KXtcclxuICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgPiAwICYmIGluZGV4ICUgMiA9PSAwO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdHlsZXM6IFtcImJhY2tncm91bmQtY29sb3I6IGRhcmtzZWFncmVlbjtcIiwgXCJjb2xvcjogYmxhY2s7XCJdLFxyXG4gICAgICAgICAgICBmdWxscm93OiB0cnVlXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXSovXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuY29uZGl0aW9uYWxTdHlsZU9wdGlvbnMgPSB7XHJcbiAgICAgICAgXCJhY3RpdmVcIjogdHJ1ZSxcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5mb3JtYXR0ZXIgPSB7fVxyXG4gICAgICB0aGlzLmZvcm1hdHRlck9wdGlvbnMgPSB7XHJcbiAgICAgICAgXCJhY3RpdmVcIjogdHJ1ZSxcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5maWx0ZXIgPSB7fVxyXG4gICAgICB0aGlzLmZpbHRlck9wdGlvbnMgPSB7XHJcbiAgICAgICAgXCJhY3RpdmVcIjogdHJ1ZSxcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5zb3J0ZWRCeSA9IFtdO1xyXG4gICAgICB0aGlzLnNvcnRPcHRpb25zID0ge1xyXG4gICAgICAgIFwiYWN0aXZlXCI6IHRydWUsXHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5jdXN0b21Db21wYXJlTnVtYmVycyA9IGNvbXBhcmVOdW1iZXJzO1xyXG4gICAgICB0aGlzLmN1c3RvbUNvbXBhcmVUZXh0ID0gY29tcGFyZVRleHQ7XHJcbiAgICAgIHRoaXMuY3VzdG9tQ2hvb3NlU29ydHNDb21wYXJlRm4gPSBjaG9vc2VTb3J0c0NvbXBhcmVGbjtcclxuICAgICAgXHJcbiAgICAgIHRoaXMuZHJhd09wdGlvbmFscyA9IHt9O1xyXG5cclxuICAgICAgdGhpcy50aWNrZWRSb3dzID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZFBhcnRpYWxPcHRpb25zKHBhcnRpYWxPcHRpb25zKXtcclxuICAgICAgaWYgKHRoaXMuZGF0YS5sZW5ndGggPiAwKXtcclxuICAgICAgICBjb25zb2xlLmxvZygncGFydGlhbCcsIHBhcnRpYWxPcHRpb25zKVxyXG4gICAgICAgIE9iamVjdC5rZXlzKHBhcnRpYWxPcHRpb25zKS5zb3J0KChhLCBiKSA9PiAoYSA9PSAnaGlkZGVuQ29sdW1ucycpID8gMSA6IC0xKS5mb3JFYWNoKG9wdGlvbiA9PiB7XHJcbiAgICAgICAgICBpZihvcHRpb24gPT0gJ3NvcnRlZEJ5Jyl7XHJcbiAgICAgICAgICAgIHJlYXBwbHlTb3J0aW5nKHRoaXMsIHBhcnRpYWxPcHRpb25zZik7XHJcbiAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbiA9PSAnaGlkZGVuQ29sdW1ucycpIHtcclxuICAgICAgICAgICAgdGhpc1tvcHRpb25dID0gcGFydGlhbE9wdGlvbnNbb3B0aW9uXTtcclxuICAgICAgICAgICAgdGhpcy5yZWRyYXdUYWJsZSgpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpc1tvcHRpb25dID0gcGFydGlhbE9wdGlvbnNbb3B0aW9uXTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cob3B0aW9uLCB0aGlzW29wdGlvbl0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJlc2V0RmlsdGVyT3BlcmF0aW9ucyh0aGlzKVxyXG4gICAgICAgIHRoaXMucmVkcmF3RGF0YSgpXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemVMaW5rT3B0aW9ucygpe1xyXG4gICAgICBsZXQgbGlua09wdGlvbnMgPSBuZXcgT2JqZWN0KCk7XHJcbiAgICAgIHRoaXMubGlua09wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xyXG4gICAgICAgIGxpbmtPcHRpb25zW29wdGlvbl0gPSB0aGlzW29wdGlvbl07XHJcbiAgICAgIH0pXHJcbiAgICAgIGxldCBuZXdTZXJpYWxpemVkVmFsdWUgPSBidG9hKEpTT04uc3RyaW5naWZ5KGxpbmtPcHRpb25zLCAoa2V5LCB2YWx1ZSkgPT4gdmFsdWUgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IHNlcmlhbGl6ZUZ1bmN0aW9uKHZhbHVlKSA6IHZhbHVlKSk7XHJcbiAgICAgIGxldCBuZXdVcmxTZWFyY2hQYXJhbSA9IHJlcGxhY2VVcmxTZWFyY2hQYXJhbWV0ZXIoYHRhYmxlJHt0aGlzLnRhYmxlSWR9YCwgbmV3U2VyaWFsaXplZFZhbHVlKTtcclxuICAgICAgaWYodGhpcy5kcmF3T3B0aW9uYWxzLnJld3JpdGV1cmwpIGhpc3RvcnkucmVwbGFjZVN0YXRlKGhpc3Rvcnkuc3RhdGUsICcnLCBuZXdVcmxTZWFyY2hQYXJhbSlcclxuICAgIH1cclxuXHJcbiAgICBsb2FkTGlua09wdGlvbnMoKXtcclxuICAgICAgbGV0IHNlcmlhbGl6ZWRPcHRpb25zID0gJ3t9JztcclxuICAgICAgbG9jYXRpb24uc2VhcmNoLnNsaWNlKDEpLnNwbGl0KCcmJykuZm9yRWFjaChzZWFyY2hPcHRpb24gPT4ge1xyXG4gICAgICAgIGxldCBzcGxpdCA9IHNlYXJjaE9wdGlvbi5zcGxpdCgnPScpXHJcbiAgICAgICAgaWYoc3BsaXRbMF0gPT0gYHRhYmxlJHt0aGlzLnRhYmxlSWR9YCl7XHJcbiAgICAgICAgICBzZXJpYWxpemVkT3B0aW9ucyA9IGF0b2Ioc3BsaXQuc2xpY2UoMSkuam9pbignPScpKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICAgIGxldCBwYXJ0aWFsT3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VyaWFsaXplZE9wdGlvbnMsIChrZXksIHZhbHVlKSA9PiB7XHJcbiAgICAgICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBBcnJheSkgICYmIHZhbHVlLnRvU3RyaW5nKCkubWF0Y2goZnVuUmVnZXgpKSB7XHJcbiAgICAgICAgICByZXR1cm4gZGVzZXJpYWxpemVGdW5jdGlvbih2YWx1ZSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIHZhbHVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIHBhcnRpYWxPcHRpb25zO1xyXG4gICAgICAvLyB0aGlzLnJlZHJhd0RhdGEoKTpcclxuICAgIH1cclxuXHJcbiAgICBkZXNlcmlhbGl6ZU9wdGlvbnMoc2VyaWFsaXplZE9wdGlvbnMpe1xyXG4gICAgICBpZihzZXJpYWxpemVkT3B0aW9ucyl7XHJcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoYXRvYihzZXJpYWxpemVkT3B0aW9ucywgKGtleSwgdmFsdWUpID0+IHtcclxuICAgICAgICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpICAmJiB2YWx1ZS50b1N0cmluZygpLm1hdGNoKGZ1blJlZ2V4KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZGVzZXJpYWxpemVGdW5jdGlvbih2YWx1ZSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSkpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiB7fTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRTZXJpYWxpemVkT3B0aW9ucyhzZXJpYWxpemVkT3B0aW9ucyl7XHJcbiAgICAgIHRoaXMub3B0aW9ucyA9IEpTT04ucGFyc2Uoc2VyaWFsaXplZE9wdGlvbnMsIChrZXksIHZhbHVlKSA9PiB7XHJcbiAgICAgICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBBcnJheSkgICYmIHZhbHVlLnRvU3RyaW5nKCkubWF0Y2goZnVuUmVnZXgpKSB7XHJcbiAgICAgICAgICByZXR1cm4gZGVzZXJpYWxpemVGdW5jdGlvbih2YWx1ZSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIHZhbHVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgICAgLy8gdGhpcy5zb3J0ZWREYXRhID0gYXBwbHlTb3J0aW5nKHRoaXMpO1xyXG4gICAgICB0aGlzLnRpY2tlZFJvd3MgPSB0aGlzLm9wdGlvbnMudGlja2VkUm93cztcclxuICAgICAgdGhpcy5yZWRyYXdEYXRhKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsZWQgd2hlbiB0YWJsZSBpcyBhZGRlZCB0byBET00uIERvZXNuJ3QgbmVlZCB0byBiZSBjYWxsZWQgbWFudWFsbHkuXHJcbiAgICAgKi9cclxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCl7XHJcbiAgICAgIGlmKCF0aGlzLnJvb3RfZG9jdW1lbnQuYm9keSkgdGhpcy5yb290X2RvY3VtZW50LmJvZHkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdib2R5Jyk7XHJcbiAgICAgIGlmKCF0aGlzLnJvb3RfZG9jdW1lbnQuaGVhZCkgdGhpcy5yb290X2RvY3VtZW50LmhlYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoZWFkJyk7XHJcblxyXG4gICAgICAvLyB0aGlzLnRhYmxlSWQgPSB0aGlzLnJvb3RfZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLndndC1ncmlkLWNvbnRhaW5lcicpLmxlbmd0aDsgLy8vLyBUT0RPOiBjaGVjayBpZiBtdWx0aXBsZSB0YWJsZXMgaGF2ZSBjb25zaXN0YW50bHkgZGlmZmVyZW50IGlkcy5cclxuICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKGB0YWJsZS1pZC0ke3RoaXMudGFibGVJZH1gKTsgICAgICBcclxuICAgICAgdGhpcy5jbGFzc0xpc3QuYWRkKCd3Z3QtZ3JpZC1jb250YWluZXInKVxyXG4gICAgICBpZighdGhpcy5zb3J0ZWREYXRhICYmIHRoaXMuZGF0YSkgdGhpcy5zb3J0ZWREYXRhID0gdGhpcy5kYXRhLm1hcCh2YWx1ZSA9PiB2YWx1ZSk7XHJcbiAgICAgIGxldCBoZWlnaHQgPSB0aGlzLmdldEF0dHJpYnV0ZSgnaGVpZ2h0Jyk7XHJcbiAgICAgIGlmKGhlaWdodCkgdGhpcy5zdHlsZS5tYXhIZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICAgIGxldCBwYWdlU2l6ZSA9IHRoaXMuZ2V0QXR0cmlidXRlKCdwYWdlLXNpemUnKTtcclxuICAgICAgaWYocGFnZVNpemUpIHtcclxuICAgICAgICB0aGlzLnBhZ2luYXRpb24ucGFnZVNpemUgPSBwYWdlU2l6ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5sb2FkSW5pdGlhbE9wdGlvbnMoKTtcclxuICAgICAgZHJhd1RhYmxlKHRoaXMpO1xyXG4gICAgfVxyXG4gXHJcbiAgICBsb2FkSW5pdGlhbE9wdGlvbnMoKXtcclxuICAgICAgbGV0IGF0dHJpYnV0ZU9wdGlvbnMgPSB0aGlzLmRlc2VyaWFsaXplT3B0aW9ucyh0aGlzLmdldEF0dHJpYnV0ZSgnb3B0aW9ucycpKTtcclxuICAgICAgbGV0IGxpbmtPcHRpb25zID0gdGhpcy5sb2FkTGlua09wdGlvbnMoKTtcclxuXHJcbiAgICAgICgobmV3IFNldChPYmplY3Qua2V5cyhhdHRyaWJ1dGVPcHRpb25zKSkpLnVuaW9uKE9iamVjdC5rZXlzKGxpbmtPcHRpb25zKSkpLmZvckVhY2gob3B0aW9uID0+IHtcclxuICAgICAgICBpZihhdHRyaWJ1dGVPcHRpb25zW29wdGlvbl0pe1xyXG4gICAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbl0gPSBhdHRyaWJ1dGVPcHRpb25zW29wdGlvbl07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGxpbmtPcHRpb25zW29wdGlvbl0gJiYgT2JqZWN0LmtleXMobGlua09wdGlvbnNbb3B0aW9uXSkubGVuZ3RoICE9IDApe1xyXG4gICAgICAgICAgdGhpcy5vcHRpb25zW29wdGlvbl0gPSBsaW5rT3B0aW9uc1tvcHRpb25dO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMub3B0aW9ucylcclxuXHJcbiAgICAgIHRoaXMubG9hZFBhcnRpYWxPcHRpb25zKHRoaXMub3B0aW9ucyk7XHJcbiAgICB9IFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29uZmlndXJlIGEgZGVib3VuY2UgZnVuY3Rpb24gZm9yIGV2ZW50IGJhc2VkIHRhYmxlIGNoYW5nZXMgbGlrZSBzb3J0Q2xpY2sgYW5kIGZpbHRlckNoYW5nZS5cclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZGVib3VuY2VGbiBhIGRlYm91bmNlIGZ1bmN0aW9uOyBoYXMgdG8gcmV0dXJuIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb247IHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gc2hvdWxkIGltcGxlbWVudCBhIGNhbmNlbCBmdW5jdGlvbi4gKHRlc3RlZCB3aXRoIGxvZGFzaC5kZWJvdW5jZSlcclxuICAgICAqIEBwYXJhbSB7QXJyYXk8YW55Pn0gc29ydERlYm91bmNlT3B0aW9ucyB0aGUgYXJndW1lbnRzIGxpc3QgZm9yIHRoZSBzb3J0IGNsaWNrIGV2ZW50IHJlcXVpcmVkIGJ5IHRoZSBkZWJvdW5jZSBmdW5jdGlvbi5cclxuICAgICAqIEBwYXJhbSB7QXJyYXk8YW55Pn0gZmlsdGVyRGVib3VuY2VkT3B0aW9ucyB0aGUgYXJndW1lbnRzIGxpc3QgZm9yIHRoZSBmaWx0ZXIgY2hhbmdlIGV2ZW50IHJlcXVpcmVkIGJ5IHRoZSBkZWJvdW5jZSAgYnkgdGhlIGRlYm91bmNlIGZ1bmN0aW9uLlxyXG4gICAgICovXHJcbiAgICBzZXREZWJvdW5jZUZuKGRlYm91bmNlRm4sIHNvcnREZWJvdW5jZU9wdGlvbnMsIGZpbHRlckRlYm91bmNlZE9wdGlvbnMpe1xyXG4gICAgICBpZih0aGlzLm9wdGlvbmFsRGVib3VuY2VGbikge1xyXG4gICAgICAgIG9uU29ydENsaWNrLmNhbmNlbCgpXHJcbiAgICAgICAgZmlsdGVyQ2hhbmdlZC5jYW5jZWwoKVxyXG4gICAgICB9XHJcbiAgICAgIHRoaXMub3B0aW9uYWxEZWJvdW5jZUZuID0gZGVib3VuY2VGbjtcclxuICAgICAgb25Tb3J0Q2xpY2sgPSB0aGlzLm9wdGlvbmFsRGVib3VuY2VGbihvblNvcnRDbGljaywgLi4uc29ydERlYm91bmNlT3B0aW9ucyk7XHJcbiAgICAgIGZpbHRlckNoYW5nZWQgPSB0aGlzLm9wdGlvbmFsRGVib3VuY2VGbihmaWx0ZXJDaGFuZ2VkLCAuLi5maWx0ZXJEZWJvdW5jZWRPcHRpb25zKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFNldCB0aGUgZGF0YSB0byBiZSBkaXNwbGF5ZWQgYnkgdGFibGUgYXMgYSBsaXN0IG9mIHJvdyBvYmplY3RzLlxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5PE9iamVjdD59IGRhdGEgXHJcbiAgICAgKi9cclxuICAgIHNldERhdGEoZGF0YSl7XHJcbiAgICAgIGxldCBkYXRhV2l0aEluY2x1ZGUgPSBkYXRhLm1hcChlbnRyeSA9PiB7XHJcbiAgICAgICAgbGV0IHRlbXBSb3cgPSBlbnRyeTtcclxuICAgICAgICAvLyBkZWxldGUgdGVtcFJvd1snI2luY2x1ZGUnXTtcclxuICAgICAgICAvLyB0ZW1wUm93WycjaW5jbHVkZSddID0gJ3gnO1xyXG4gICAgICAgIGxldCByZXN1bHQgPSB7JyNpbmNsdWRlJzogJ3gnfTtcclxuICAgICAgICBPYmplY3Qua2V5cyh0ZW1wUm93KS5mb3JFYWNoKGtleSA9PiB7XHJcbiAgICAgICAgICByZXN1bHRba2V5XSA9IHRlbXBSb3dba2V5XTsgXHJcbiAgICAgICAgfSlcclxuICAgICAgICAvLyBsZXQgcmVzdWx0ID0geycjaW5jbHVkZSc6ICd4JywgLi4udGVtcFJvd307XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgfSk7XHJcbiAgICAgIGNvbnNvbGUubG9nKCd3aXRoIEluY2x1ZGUnLCBkYXRhV2l0aEluY2x1ZGUpO1xyXG4gICAgICB0aGlzLmRhdGEgPSBkYXRhV2l0aEluY2x1ZGU7XHJcbiAgICAgIC8vIGNvbnNvbGUubG9nKHRyYW5zZm9ybVRvR3JvdXBlZERhdGEoZGF0YSwgW1wiQmVsSURcIiwgXCJCZWxlZ2RhdHVtXCIsIFwiTGllZmVyYW50XCIsIFwiTmV0dG9iZXRyYWdcIl0pKVxyXG4gICAgICB0aGlzLnNvcnRlZERhdGEgPSB0aGlzLmRhdGEubWFwKHZhbHVlID0+IHZhbHVlKTtcclxuICAgICAgZHJhd1RhYmxlKHRoaXMpO1xyXG4gICAgICB0aGlzLmxvYWRJbml0aWFsT3B0aW9ucygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IHRoZSBkYXRhIHRoYXQgaXMgc29ydGVkLCBmb3JtYXR0ZWQgYW5kIGZpbHRlcmVkLlxyXG4gICAgICovXHJcbiAgICBnZXREaXNwbGF5ZWREYXRhKCl7XHJcbiAgICAgIHJldHVybiB0aGlzLmRpc3BsYXllZERhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgdGhlIG9yaWdpbmFsIERhdGEgdGhhdCB3YXMgc3VwcGxpZWQgdG8gdGhlIHRhYmxlLlxyXG4gICAgICovXHJcbiAgICBnZXRPcmlnaW5hbERhdGEoKXtcclxuICAgICAgcmV0dXJuIHRoaXMuZGF0YTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEZvcmNlIGEgcmVmcmVzaCwgaW4gY2FzZSB0aGUgZGF0YSBoYXMgY2hhbmdlZC4gQWx0ZXJuYXRpdmVseSB5b3UgY2FuIGNhbGwgVGFibGVDb21wb25lbnQuc2V0RGF0YShuZXdEYXRhKS5cclxuICAgICAqL1xyXG4gICAgcmVkcmF3RGF0YSgpe1xyXG4gICAgICB0aGlzLmhlYWRlci5mb3JFYWNoKGNvbHVtbiA9PiB7XHJcbiAgICAgICAgaWYgKHRoaXMuZWxlbWVudHMuZGF0YUNlbGxzW2NvbHVtbl0pIFtdLmZvckVhY2guY2FsbCh0aGlzLmVsZW1lbnRzLmRhdGFDZWxsc1tjb2x1bW5dLCBlbGVtZW50ID0+IGVsZW1lbnQucmVtb3ZlKCkpO1xyXG4gICAgICAgIGlmICh0aGlzLmRyYXdPcHRpb25hbHMuZmlsdGVyICYmIHRoaXMuZWxlbWVudHMuZmlsdGVyQ2VsbHNbY29sdW1uXS5maXJzdENoaWxkLnRleHRDb250ZW50ICE9IHRoaXMuZmlsdGVyW2NvbHVtbl0pIHRoaXMuZWxlbWVudHMuZmlsdGVyQ2VsbHNbY29sdW1uXS5maXJzdENoaWxkLnRleHRDb250ZW50ID0gdGhpcy5maWx0ZXJbY29sdW1uXTtcclxuICAgICAgICAvLyB0aGlzLmVsZW1lbnRzLmZpbHRlckNlbGxzW2NvbHVtbl0uZmlyc3RDaGlsZC50ZXh0Q29udGVudCA9IHRoaXMuZmlsdGVyW2NvbHVtbl0gPyB0aGlzLmZpbHRlcltjb2x1bW5dIDogJyc7XHJcblxyXG4gICAgICB9KTsgXHJcbiAgICAgIGlmICh0aGlzLmRhdGEubGVuZ3RoID4gMCl7XHJcbiAgICAgICAgbGV0IHdhc1NlbGVjdGVkID0gdGhpcy5lbGVtZW50cy5wYWdlQ2hvb3NlciA/IHRoaXMuZWxlbWVudHMucGFnZUNob29zZXIuY2xhc3NMaXN0LmNvbnRhaW5zKCdzZWxlY3RlZCcpIDogZmFsc2U7XHJcbiAgICAgICAgdGhpcy5kaXNwbGF5ZWREYXRhID0gZHJhd0RhdGEodGhpcyk7XHJcbiAgICAgICAgdGhpcy5lbGVtZW50cy5wYWdlQ2hvb3NlciA9IGNyZWF0ZVBhZ2VDaG9vc2VyKHRoaXMsIHRoaXMuZGlzcGxheWVkRGF0YSk7XHJcbiAgICAgICAgaWYgKHRoaXMuZHJhd09wdGlvbmFscy5mb290ZXIpIGNyZWF0ZUZvb3Rlcih0aGlzLCB0aGlzLmRpc3BsYXllZERhdGEsIHRoaXMuZWxlbWVudHMucGFnZUNob29zZXIpO1xyXG4gICAgICAgIGlmICh3YXNTZWxlY3RlZCkgdGhpcy5lbGVtZW50cy5wYWdlQ2hvb3Nlci5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmVkcmF3VGFibGUoKXtcclxuICAgICAgLy90aGlzLnNvcnRlZERhdGEgPSB0aGlzLmRhdGEubWFwKHZhbHVlID0+IHZhbHVlKTtcclxuICAgICAgbGV0IHBhcnRpYWxPcHRpb25zID0ge307XHJcbiAgICAgIE9iamVjdC5rZXlzKHRoaXMub3B0aW9ucykuZm9yRWFjaChvcHRpb24gPT4ge1xyXG4gICAgICAgIGlmKHRoaXMubGlua09wdGlvbnMuaW5jbHVkZXMob3B0aW9uKSl7XHJcbiAgICAgICAgICBwYXJ0aWFsT3B0aW9uc1tvcHRpb25dID0gdGhpc1tvcHRpb25dO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICAgIGRyYXdUYWJsZSh0aGlzKTtcclxuICAgICAgcmVhcHBseVNvcnRpbmcodGhpcywgcGFydGlhbE9wdGlvbnMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtyZWdleEZpbHRlciwgdGV4dEZpbHRlciwgY29tcGFyZU51bWJlcnMsIGNvbXBhcmVUZXh0LCBjaG9vc2VTb3J0c0NvbXBhcmVGbiwgZGVmaW5lQ3VzdG9tRWxlbWVudCwgVGFibGVDb21wb25lbnR9O1xyXG59KSgpIiwidmFyIGNzcyA9IFwiZGl2LndndC1oZWFkZXIgZGl2IHtcXG4gIHdvcmQtd3JhcDogbm9ybWFsO1xcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcXG59XFxucHJvdC10YWJsZS12MyB1bCB7XFxuICBwYWRkaW5nLXRvcDogNXB4O1xcbiAgcGFkZGluZy1sZWZ0OiAxMHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7XFxufVxcblwiOyAocmVxdWlyZShcImJyb3dzZXJpZnktY3NzXCIpLmNyZWF0ZVN0eWxlKGNzcywgeyBcImhyZWZcIjogXCJzdHlsZS5jc3NcIiB9LCB7IFwiaW5zZXJ0QXRcIjogXCJib3R0b21cIiB9KSk7IG1vZHVsZS5leHBvcnRzID0gY3NzOyJdfQ==
