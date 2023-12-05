const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const app = express();
const path = require('path');
const session = require('express-session');

// Configuração do Express
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(express.static(path.join(__dirname, 'public')));

//Conexão com o banco
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'sua_Senha',
  database: 'ecomerce'
});

db.connect(err => {
  if (err) {
    console.log('Erro ao conectar ao MySQL: ' + err.message);
  } else {
    console.log('Conectado ao MySQL');
  }
});

//Configurando session
app.use(session({
  secret: 'inicio',
  resave: false,
  saveUninitialized: false
}));


// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

//Rotas
app.get('/', (req, res) =>{
  const sql = "SELECT produto.*, imagensProduto.* FROM ecomerce.produto LEFT JOIN ecomerce.imagensProduto ON produto.id_produto = imagensProduto.produto_id_produto;"
  db.query(sql, (err, results) =>{
    if (err) {
      console.log(err);
    } else {
      res.render('index', { produtos: results });
    }
  });
});

app.get('/contato', (req, res) =>{
  res.render('contato');
});

 app.get('/carrinho', (req, res) => {
  if (req.session.userId) {
    const sql = "SELECT * FROM cliente WHERE id_cliente = ?;";
    const id_cliente = req.session.userId;

    db.query(sql, [id_cliente], (err, result) => {
      if (err) {
        console.error("Erro ao consultar o cliente:", err);
        return res.status(500).send("Erro no servidor");
      }

      if (!result || result.length === 0) {
        console.log("Cliente não encontrado");
        return res.render('login');
      }

      const cpf = result[0].cpf_cliente;
      const nome = result[0].nome_cliente;
      console.log(cpf);
      const sql2 = "SELECT carrinho.*, produto.*,  imagensproduto.* FROM carrinho INNER JOIN produto ON carrinho.produto_id_produto = produto.id_produto INNER JOIN imagensproduto ON produto.id_produto = id_imagens_produto WHERE carrinho.cliente_cpf_cliente = ?;";

      db.query(sql2, [cpf], (err, results) => {
        if (err) {
          console.error("Erro ao consultar o carrinho:", err);
          return res.status(500).send("Erro no servidor");
        }

        if (!results || results.length === 0) {
          console.log("Cliente não comprou nada ainda");
          return res.render('carrinho', { produtos: 0, total:0, nome: nome });
        }
        
        //return res.render('carrinho', { produtos: results });
        /* Modifiquei aqui */
       const sql3 = 'SELECT c.cliente_cpf_cliente, SUM(p.preco_produto) AS total_carrinho FROM carrinho c JOIN produto p ON c.produto_id_produto = p.id_produto WHERE c.cliente_cpf_cliente = ?;'
       db.query(sql3, [cpf], (err, resultado)=>{
        if(err){
          console.log("Deu erro aqui meu nobre");
        }
        const totalCarrinho = resultado[0].total_carrinho;
        console.log("Total do Carrinho:", totalCarrinho);
        return res.render('carrinho', { produtos: results, total: totalCarrinho, nome:nome });
       });
      });
      
    });
  } else {
    return res.render('login');
  }
}); 

app.get('/cadastro-cliente', (req, res)=>{
  res.render('cadastro');
});

app.post('/cadastro-cliente', (req, res)=>{
  const {nome, sobrenome, cpf, rua, bairro, cidade} = req.body;
  //console.log(nome, sobrenome, cpf, rua, bairro, cidade)
  const sql = "INSERT INTO cliente (nome_cliente, sobrenome_cliente, cpf_cliente) VALUES (?, ?, ?);"
  db.query(sql, [nome, sobrenome, cpf], (err, result1)=>{
    if(err){
      console.log("Erro ao inserir em cliente");
    }

    const sql2 = "INSERT INTO enderecos (rua, bairro, cidade, cliente_cpf_cliente) VALUES (?, ?, ?, ?);"
    db.query(sql2, [rua, bairro, cidade, cpf], (err, resuult2)=>{
      if(err){
        console.log("Erro ao inserir em enderecos");
      }
      res.redirect('/login');
    });
  });
});

app.post('/login', (req, res) => {
  const { nome, cpf } = req.body;

  const sql = 'SELECT * FROM cliente WHERE nome_cliente = ? AND cpf_cliente = ?';

  db.query(sql, [nome, cpf], (err, results) => {
    if (err) {
      console.error('Erro ao verificar credenciais:', err);
      return res.status(500).send('Erro no servidor');
    }

    if (results.length > 0) {
      const user = results[0];

      req.session.userId = user.id_cliente;

      const id_cliente = req.session.userId;
      const sql2 = 'SELECT cpf_cliente FROM cliente WHERE id_cliente = ?;';

      db.query(sql2, [id_cliente], (err, result) => {
        if (err) {
          console.error('Erro ao consultar o cliente:', err);
          return res.status(500).send('Erro no servidor');
        }

        if (!result || result.length === 0) {
          console.log('Cliente não encontrado');
          return res.render('login');
        }

        const cpf = result[0].cpf_cliente;
        const sql3 = `
        SELECT
          carrinho.*,
          produto.*,
          imagensproduto.*
        FROM
          carrinho
        INNER JOIN
          produto ON carrinho.produto_id_produto = produto.id_produto
        INNER JOIN
          imagensproduto ON produto.id_produto = imagensproduto.id_imagens_produto
        WHERE
          carrinho.cliente_cpf_cliente = ?;`;


        db.query(sql3, [cpf], (err, results) => {
          if (err) {
            console.error('Erro ao consultar o carrinho:', err);
            return res.status(500).send('Erro no servidor');
          }

          if (!results || results.length === 0) {
            console.log('Cliente não comprou nada ainda');
            return res.render('carrinho', { produtos: 0, total:0, nome:nome});
          }
          //return res.render('carrinho', { produtos: results });
          /* Modifiquie aqui */
          const sql3 = 'SELECT c.cliente_cpf_cliente, SUM(p.preco_produto) AS total_carrinho FROM carrinho c JOIN produto p ON c.produto_id_produto = p.id_produto WHERE c.cliente_cpf_cliente = ?;'
       db.query(sql3, [cpf], (err, resultado)=>{
        if(err){
          console.log("Deu erro aqui meu nobre");
        }
        const totalCarrinho = resultado[0].total_carrinho;
        return res.render('carrinho', { produtos: results, total: totalCarrinho, nome:nome });
       });

        });
      });
    } else {
      return res.status(401).send('Credenciais inválidas!');
    }
  });
});

app.get('/login', (req, res) =>{
  res.render('login');
});

app.get('/deslogar', (req, res)=>{
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao destruir a sessão:', err);
      res.status(500).send('Erro interno do servidor');
    } else {
      res.render('login');
    }
  });
});

app.get('/edite-cliente', (req, res) => {
  const id = req.session.userId;
  const sql = 'SELECT cpf_cliente FROM cliente WHERE id_cliente = ?;';
  //console.log("Valor do id: ", id);

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log('Erro ao buscar pelo id', err);
      return res.status(500).send('Erro ao buscar pelo id');
    }

    // Verifica se há resultados
    if (result.length === 0) {
      console.log('Nenhum cliente encontrado com o ID fornecido');
      return res.status(404).send('Nenhum cliente encontrado com o ID fornecido');
    }

    const cpf = result[0].cpf_cliente;

    const sql2 = 'SELECT cliente.*, enderecos.* FROM cliente INNER JOIN enderecos ON cliente.cpf_cliente = enderecos.cliente_cpf_cliente WHERE cliente.cpf_cliente = ?;';

    db.query(sql2, [cpf], (err, results) => {
      if (err) {
        console.log('Erro ao buscar cliente', err);
        return res.status(500).send('Erro ao buscar cliente');
      }

      console.log('Aqui', results);
      res.render('editeCliente', { cliente: results });
    });
  });
});

app.post('/edite-cliente', (req, res)=>{
  const id = req.session.userId;
  const {nome, sobrenome, cpf, rua, bairro, cidade} = req.body;
  const sql = 'UPDATE cliente SET nome_cliente=?, sobrenome_cliente=?, cpf_cliente=? WHERE id_cliente=?';
  db.query(sql, [nome, sobrenome, cpf, id], (err, result)=>{
    if(err){
      console.log("Erro ao atualizar a tabela cliente");
    }

    const sql2 = 'UPDATE enderecos SET rua=?, bairro=?, cidade=? WHERE cliente_cpf_cliente=?';
    db.query(sql2, [rua, bairro, cidade, cpf], (err, results)=>{
      if(err){
        console.log("Erro ao atualizar a tabela endereços");
      }
      res.redirect('/carrinho')
    });
  });
});

app.get('/exluir-cliente', (req, res) => {
  const id = req.session.userId;
  const sql = 'SELECT cpf_cliente FROM cliente WHERE id_cliente = ?;';

  db.query(sql, [id], (err, result1) => {
    if (err) {
      console.log('Erro ao obter cpf');
      return res.status(500).send('Erro ao obter cpf');
    }

    if (result1.length === 0) {
      console.log('Nenhum cliente encontrado com o ID fornecido');
      return res.status(404).send('Nenhum cliente encontrado com o ID fornecido');
    }

    const cpf = result1[0].cpf_cliente;

    // Deletar registros da tabela carrinho
    const deleteCarrinhoSql = 'DELETE FROM carrinho WHERE cliente_cpf_cliente = ?';
    db.query(deleteCarrinhoSql, [cpf], (err, result) => {
      if (err) {
        console.error('Erro ao deletar registros do carrinho:', err);
        return res.status(500).send('Erro ao deletar registros do carrinho');
      }

      // Deletar registros da tabela enderecos
      const deleteEnderecosSql = 'DELETE FROM enderecos WHERE cliente_cpf_cliente = ?';
      db.query(deleteEnderecosSql, [cpf], (err, result) => {
        if (err) {
          console.error('Erro ao deletar registros de endereços:', err);
          return res.status(500).send('Erro ao deletar registros de endereços');
        }

        // Deletar registro da tabela cliente
        const deleteClienteSql = 'DELETE FROM cliente WHERE id_cliente = ?';
        db.query(deleteClienteSql, [id], (err, result) => {
          if (err) {
            console.error('Erro ao deletar registro do cliente:', err);
            return res.status(500).send('Erro ao deletar registro do cliente');
          }

          res.redirect('/');
        });
      });
    });
  });
});


app.get('/adicionarcarrinho/:id', (req, res) =>{
  if (req.session.userId){
    const sql = "SELECT cpf_cliente FROM cliente WHERE id_cliente = ?;";
    const id_cliente = req.session.userId;
    const id_produto = req.params.id;

    db.query(sql, [id_cliente], (req, result) => {
      const cpf = result[0].cpf_cliente;
      
      const sql2 = "INSERT INTO carrinho (cliente_cpf_cliente, produto_id_produto) VALUES (?, ?);"
      db.query(sql2, [cpf, id_produto], (err, result)=>{
        if(err){
          console.log("Erro ao inserir no carrinho", err);
        }
        res.redirect('/carrinho');
      });
    });
  }else{
    return res.redirect('/login');
  }
});

app.get('/exluir-carrinho/:id', (req, res)=>{
  const id_produto = req.params.id;
  const id_cliente = req.session.userId;
  const sql = "SELECT cpf_cliente FROM cliente WHERE id_cliente = ?"

  db.query(sql, [id_cliente], (err, result)=>{
    if(err){
      console.log('Deu erro...', err)
    }

    const cpf_cliente = result[0].cpf_cliente;
    const sql2 = 'DELETE FROM carrinho WHERE produto_id_produto = ? AND cliente_cpf_cliente = ? LIMIT 1';
    db.query(sql2, [id_produto, cpf_cliente], (err, results)=>{
      if(err){
        console.log("Erro ao excluir");
      }
      res.redirect('/carrinho');
    });
    
  });
});

app.get('/sobrenos', (req, res) =>{
  res.render('sobrenos');
});

app.get('/dashboard', (req, res) =>{
  res.render('dashboard');
});

app.get('/dashboard/gestao-cliente', (req, res) =>{
  db.query('SELECT c.id_cliente, c.cpf_cliente, c.nome_cliente, c.sobrenome_cliente, e.rua, e.bairro, e.cidade FROM ecomerce.cliente c JOIN ecomerce.enderecos e ON c.cpf_cliente = e.cliente_cpf_cliente', 
  (err, result) =>{
    if(err){
      console.log(err)
    }else{
      res.render('gestaoCliente', {clientes: result});
    }
  });
});

app.get('/dashboard/gestao-produto', (req, res) =>{
  res.render('gestaoProdutos');
});

app.get('/dashboard/gestao-cliente/delete/:id', (req, res) => {
  const id_produto = req.params.id;
  const deleteEnderecosQuery = `DELETE FROM enderecos WHERE cliente_cpf_cliente = ?`;
  db.query(deleteEnderecosQuery, [id_produto], (err, results) =>{
    if (err) {
      console.error('Erro ao excluir enderecos:', err);
      return res.status(500).send('Erro ao excluir enderecos');
    }

    const deleteClienteQuery = `DELETE FROM cliente WHERE cpf_cliente = ?`;
    db.query(deleteClienteQuery, [id_produto], (err, results) =>{
      if (err) {
        console.error('Erro ao excluir cliente:', err);
        return res.status(500).send('Erro ao excluir cliente');
      }

      res.redirect('/dashboard/gestao-cliente');
    });
  });
});

/* Produtos */
app.get('/dashboard/gestao-produto/cadastro-produto', (req, res) =>{
  res.render('cadastroProduto')
});

app.get('/dashboard/gestao-cliente/visualizar-produtos', (req, res) =>{
  const sql = 'SELECT produto.*, imagensProduto.* FROM ecomerce.produto LEFT JOIN ecomerce.imagensProduto ON produto.id_produto = imagensProduto.produto_id_produto';
  db.query(sql, (err, results) =>{
    if (err) {
      console.log(err);
    } else {
      res.render('visualizarProduto', { produtos: results });
    }
  });
});

app.get('/informacoes-produto/:id', (req, res) =>{
  const id_produto = req.params.id;
  const sql = 'SELECT produto.*, imagensProduto.* FROM ecomerce.produto LEFT JOIN ecomerce.imagensProduto ON produto.id_produto = imagensProduto.produto_id_produto WHERE id_produto = ?;'

  db.query(sql, [id_produto], (err, result) =>{
    if (err) {
      console.error('Produto não encontrado! ', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }else{
      res.render('informacoesProduto', { produto: result[0], imagem_produto: '/uploads/${result[0].imagem_produto}' });
      //console.log(result);
    }

  });
});

app.post('/dashboard/gestao-produto/cadastro-produto', upload.single('imagem'), (req, res) =>{
  const { nome_produto, descricao_produto, preco_produto, genero_produto, nome_imagem } = req.body;
  const imagem = req.file.filename;

  const produto = 'INSERT INTO produto (nome_produto, descricao_produto, preco_produto, genero_produto) VALUES (?, ?, ?, ?)';
  const produtoValues = [nome_produto, descricao_produto, preco_produto, genero_produto];

  db.query(produto, produtoValues, (err, produtoResult) =>{
    if (err) {
      console.error('Erro ao inserir produto:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    const produtoId = produtoResult.insertId;

    const imagemSql = 'INSERT INTO imagensProduto (nome_imagem, imagem_produto, produto_id_produto) VALUES (?, ?, ?)';
    const imagemValues = [nome_imagem, imagem, produtoId];

    db.query(imagemSql, imagemValues, (err, imagemResult) =>{
      if (err) {
        console.error('Erro ao inserir imagem de produto:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      res.redirect('/dashboard/gestao-produto');
    });
  });
});

app.get('/dashboard/gestao-cliente/visualizar-produtos/edit/:id', (req, res) => {
  const id_produto = req.params.id;
  const sql = "SELECT produto.*, imagensProduto.* FROM ecomerce.produto LEFT JOIN ecomerce.imagensProduto ON produto.id_produto = imagensProduto.produto_id_produto WHERE id_produto = ?;"
  db.query(sql, [id_produto], (err, result) =>{
    if (err) {
      console.log(err);
    } else {
      res.render('editProduto', { produto: result[0] });
    }
  });
});

app.post('/dashboard/gestao-cliente/visualizar-produtos/edit/:id_produto', upload.single('imagem'), (req, res) => {
  const { id_produto, nome_produto, descricao_produto, preco_produto, genero_produto, nome_imagem } = req.body;
  const imagem = req.file;

  console.log(id_produto, nome_produto, descricao_produto);

  const produtoSql = "UPDATE produto SET nome_produto=?, descricao_produto=?, preco_produto=?, genero_produto=? WHERE id_produto=?;"
  const produtoValues = [nome_produto, descricao_produto, preco_produto, genero_produto, id_produto];
  db.query(produtoSql, produtoValues, (err, produtoResult) =>{
    if (err) {
      console.error('Erro ao atualizar produto:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if(imagem){
      const imagemSql = 'UPDATE imagensProduto SET nome_imagem=?, imagem_produto=? WHERE produto_id_produto=?';
      const imagemValues = [nome_imagem, imagem.filename, id_produto];

      db.query(imagemSql, imagemValues, (err, resultImagem) =>{
        if (err) {
          console.error('Erro ao atualizar imagem de produto:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        res.redirect('/dashboard/gestao-cliente/visualizar-produtos');
      });
    }else{
        res.redirect('/dashboard/gestao-cliente/visualizar-produtos');
    }

  });
});

app.get('/dashboard/gestao-cliente/visualizar-produtos/delete/:id', (req, res) => {
  const id_produto = req.params.id;
  const deleteEnderecosQuery = `DELETE FROM imagensProduto WHERE produto_id_produto = ?`;
  db.query(deleteEnderecosQuery, [id_produto], (err, results) =>{
    if (err) {
      console.error('Erro ao excluir enderecos:', err);
      return res.status(500).send('Erro ao excluir enderecos');
    }

    const deleteCarrinho = `DELETE FROM carrinho WHERE produto_id_produto = ?`;
      db.query(deleteCarrinho, [id_produto], (err, results1)=>{
        if(err){
          console.log("Não existe esse produto no carrinho ainda!");
        }
      });

    const deleteClienteQuery = `DELETE FROM produto WHERE id_produto = ?`;
    db.query(deleteClienteQuery, [id_produto], (err, results) =>{
      if (err) {
        console.error('Erro ao excluir cliente:', err);
        return res.status(500).send('Erro ao excluir cliente');
      }
      res.redirect('/dashboard/gestao-cliente/visualizar-produtos');
    });
  });
});
// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
