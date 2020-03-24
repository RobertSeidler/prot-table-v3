let wcGridTable = require("wc-grid-table/src/wc-grid-table.js");



// wcGridTable.defineCustomElement()

class ProtTable extends wcGridTable.TableComponent {
  useDefaultOptions(){
    super.useDefaultOptions();
    
  }

  connectedCallback(){
    super.connectedCallback();

    let height = this.getAttribute('height');
    let pageSize = this.getAttribute('page-size');

    if(height) this.style.maxHeight = height;
    if(pageSize){
      this.pagination.pageSize = pageSize;
      // this.options.pagination.pageSize = pageSize;
    } else{
      this.pagination.pageSize = 500;
      // this.options.pagination.pageSize = 500;
    }

    fetch('http://prot-subuntu:5985/ang_prot-wiki/prot-wiki_Legende')
      .then(response => response.json())
      .then(response => {
        let links = response.auskunftSchemaLinks;
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

  setupProtTableData(){

    let jsonUrl = this.getAttribute('data_url');
    if(jsonUrl){
      fetch(jsonUrl)
        .then(data => data.json())
        .then(data => this.setData(data))
    }
  }
}

customElements.define('prot-table-v3', ProtTable);



// console.log()