-- 2026-09-29 22:30:00

-- up
INSERT INTO public.imoveis (codigo, tipo, finalidade, endereco, numero, complemento, bairro, cidade, estado, cep, quartos, banheiros, garagem, area_util, valor_venda, valor_aluguel, valor_iptu, propriedade, status, observacoes) VALUES
  ('PSS-001','Apartamento','aluguel','RUA BONIFÁCIO NÓBREGA','817-APT 101','COND. VILLA RICA','CENTRO','SANTA LUZIA','PB','58600000',3,1,0,52,NULL,800.00,NULL,'VILLA RICA','disponivel','EM REFORMA'),
  ('PSS-002','Apartamento','aluguel','RUA BONIFÁCIO NÓBREGA','817-APT 102','COND. VILLA RICA','CENTRO','SANTA LUZIA','PB','58600000',2,1,0,52,NULL,800.00,NULL,'VILLA RICA','alugado',NULL),
  ('PSS-003','Apartamento','aluguel','RUA PEDRO HONORATO','817-APT-004','COND. VILLA RICA','CENTRO','SANTA LUZIA','PB','58600000',2,1,0,52,NULL,800.00,NULL,'VILLA RICA','alugado',NULL),
  ('PSS-004','Casa','aluguel','TRAV. BONIFACIO NÓBREGA','86',NULL,'CENTRO','SANTA LUZIA','PB','58600000',0,2,0,52,NULL,800.00,NULL,'CASA GRANDE','alugado','CASA GRANDE');

-- down
DELETE FROM public.imoveis WHERE codigo IN ('PSS-001','PSS-002','PSS-003','PSS-004');