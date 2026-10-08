-- Cardápio atual do site (rode depois do schema.sql)
insert into categorias(nome,ordem,intro) values
('Tradicionais',1,''),
('Picanha',2,'Carne de Picanha'),
('Artesanais',3,'Sabores únicos, feito com o toque especial, que só o Artesanal tem. Experimente o sabor de qualidade em cada detalhe.'),
('Batatas',4,''),
('Bebidas',5,''),
('Combos',6,''),
('Sobremesas',7,'');
insert into produtos(categoria_id,nome,descricao,preco) select id,'Hamburguer','Pão, Carne, Queijo e Batata Palha',8.00 from categorias where nome='Tradicionais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'X*EGG','Pão, Carne, Ovo, Queijo, Molhos e Batata Palha',10.00 from categorias where nome='Tradicionais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Baconzitto','Pão, 2 Carnes, Bacon, Queijo, Milho, Ervilha, Azeitona e Batata Palha',18.00 from categorias where nome='Tradicionais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Mix Cheddar','Pão, 2 Carnes, Cheddar, Bacon, Cebola Caramelizada e Cheddar Cremoso',18.00 from categorias where nome='Tradicionais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'X*TUDO','Pão, Carne, Presunto, Bacon, Calabresa, Ovo, Milho, Ervilha, Picles, Azeitona, Ovo de Codorna…',16.00 from categorias where nome='Tradicionais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'X Tudinho','Pão, carne, queijo, presunto, bacon, calabresa, molhos e batata palha',14.00 from categorias where nome='Tradicionais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Fome Zero','Pão, 2 Carnes, 2 ovos, Presunto, Bacon, Calabresa, Milho, Ervilha, Picles, Azeitona, Piment…',20.00 from categorias where nome='Tradicionais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'X*Infarto','Pão, 3 Carnes, 2 ovos, Presunto, Bacon, Calabresa, Milho, Ervilha, Picles, Azeitona, Piment…',22.00 from categorias where nome='Tradicionais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Predador','Pão, 4 Carnes, 3 ovos, Presunto, Bacon, Calabresa, Milho, Ervilha, Picles, Azeitona, Piment…',26.00 from categorias where nome='Tradicionais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Molho Verde','Maionese com ervas',2.50 from categorias where nome='Tradicionais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Baconzitto Picanha','Pão, 2 carnes de Picanha, Bacon, Queijo, Milho, Ervilha, Azeitona e Batata Palha',20.00 from categorias where nome='Picanha';
insert into produtos(categoria_id,nome,descricao,preco) select id,'X*Tudo Picanha','Pão, Carne de Picanha, Presunto, Bacon, Calabresa, Ovo, Milho, Ervilha, Picles, Azeitona…',18.00 from categorias where nome='Picanha';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Fome Zero Picanha','Pão, 2 Carnes de Picanha, 2 ovos, Presunto, Bacon, Calabresa, Milho, Ervilha, Picles, Azeit…',24.00 from categorias where nome='Picanha';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Infarto de Picanha','Pão, 3 Carnes, 2 ovos, Presunto, Bacon, Calabresa, Milho, Ervilha, Picles, Azeitona, Piment…',27.00 from categorias where nome='Picanha';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Thor','Pão Amarelo, Blend de Frango, Queijo, Cebola Crispy, Bacon e Cheddar Cremoso',16.00 from categorias where nome='Artesanais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Capitão América','Pão Brioche, Blend, Bacon, Calabresa, Cebola Caramelizada, Cheddar Cremoso',20.00 from categorias where nome='Artesanais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Hulk','Pão Verde, Blend, Mussarela, Calabresa, Picles',24.00 from categorias where nome='Artesanais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Pantera Negra','Pão Preto, Blend, Bacon, Calabresa, Cheddar Cremoso, Picles, Cebola Caramelizada',24.00 from categorias where nome='Artesanais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Loki','Pão Australiano, Blend, Mussarela, Presunto, Picles e Calabresa',24.00 from categorias where nome='Artesanais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Homem de Ferro','Pão Vermelho, Blend, Bacon, Calabresa, Cebola Caramelizada, Cebola Crispy e Pimenta Biquin…',24.00 from categorias where nome='Artesanais';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Batata Frita Pequena','',7.00 from categorias where nome='Batatas';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Batata Frita Média','',10.00 from categorias where nome='Batatas';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Batata Frita Grande','Batata frita, 3 opções de molho e calabresa',23.00 from categorias where nome='Batatas';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Batata Recheada','Batatas Fritas de 7mm, 3 Molhos, Bacon, Calabresa, Ovo de Codorna, Queijo Ralado, Azeiton…',30.00 from categorias where nome='Batatas';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Guaraná Natural','',2.00 from categorias where nome='Bebidas';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Refrigerante 2 Lt','Fanta Guaraná, Fanta Laranja, Fanta Uva, Guaraná Antártica, Sprite',12.00 from categorias where nome='Bebidas';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Coca Cola 2 Lt','Normal e Zero',14.00 from categorias where nome='Bebidas';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Refrigerante Lata 350 ml','Fanta Laranja, Coca, Coca Zero, Fanta Uva, Sprite, Guaraná Antártica',6.00 from categorias where nome='Bebidas';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Guaraná Antártica','Pet 1 litro',7.00 from categorias where nome='Bebidas';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Limonetto e H2O 500 ml','',6.00 from categorias where nome='Bebidas';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo da Fome','2 Fome Zero''s + Fritas com Cheddar + Refri 2lt',60.00 from categorias where nome='Combos';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo Galera','4 X-Egg + Fritas + Refri 2lt',55.00 from categorias where nome='Combos';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo Fome Infinita','4 X-Tudo + Fritas Cheddar e Bacon + Refri 2lt',82.00 from categorias where nome='Combos';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo Família','5 Hamburgueres + Refri lt',40.00 from categorias where nome='Combos';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo Baby','Hamburguer + Fritas + Guaraná Natural',16.00 from categorias where nome='Combos';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo Tudo','X-Tudo + Frita + Guaraná Natural',23.00 from categorias where nome='Combos';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo Zero','Fome Zero + Frita + Guaraná Natural',27.00 from categorias where nome='Combos';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo Infartado','Infarto + Frita + Guaraná Natural',29.00 from categorias where nome='Combos';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo Destruidor','Predador + Frita + Guaraná Natural',33.00 from categorias where nome='Combos';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo Artesanal','Burguer de Costela + Fritas + Guaraná Natural',30.00 from categorias where nome='Combos';
insert into produtos(categoria_id,nome,descricao,preco) select id,'Combo Artesanal de Picanha','Burguer de Picanha + Fritas + Guaraná Natural',33.00 from categorias where nome='Combos';

-- bairros atendidos (edite as taxas e adicione os outros bairros no painel: Configurações)
insert into bairros_entrega(nome,taxa) values('Coelho Neto',0) on conflict(nome) do nothing;
