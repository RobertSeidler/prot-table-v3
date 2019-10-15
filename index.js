let wcGridTable = require("wc-grid-table");



// wcGridTable.defineCustomElement()

class ProtTable extends wcGridTable.TableComponent {
  useDefaultOptions(){
    super.useDefaultOptions();
    
  }

  connectedCallback(){
    super.connectedCallback();

    fetch('http://prot-subuntu:5985/ang_prot-wiki/prot-wiki_Legende')
      .then(response => response.json())
      .then(response => {
        let links = response.auskunftSchemaLinks;
        console.log(
          response.auskunftSchemaLinks
        );

        Object.keys(links).forEach(key => {
          let tmp = links[key];
          console.log(links[key])
          links[key] = [(value) => `<a href="${tmp}${value}">${value}</a>`]
        })

        this.formatter = links;

        let jsonUrl = this.getAttribute('jsonUrl');
        if(jsonUrl){
          fetch(jsonUrl)
            .then(data => data.json())
            .then(data => this.setData(data))
        }
      });
    
  }
}

customElements.define('prot-table-v3', ProtTable);



// console.log()