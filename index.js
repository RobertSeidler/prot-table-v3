let wcGridTable = require("wc-grid-table/src/wc-grid-table.js");

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
                .then(data => this.setData(data))
        }
    }
}

customElements.define('prot-table-v3', ProtTable);



// console.log()