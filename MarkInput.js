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
            // MarkerText: this.getAttribute('markertext') ? this.getAttribute('markertext') : "ja|nein",
            MarkerText: "ja|nein",
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