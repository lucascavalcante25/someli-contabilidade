BEGIN;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS data_fim_cobranca DATE;
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 7; -- ADRIELEE <- ADRIELEE
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 8; -- ALEXSANDRO RODRIGUES DO NASCIMENTO <- ALEXSANDRO RODRIGUES DO NASCIMENTO
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 10; -- ALIANCA CONSTRUCAO LTDA <- ALIANCA CONSTRUCAO LTDA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 11; -- AUTO PEÇAS NOVA ERA <- AUTO PEÇAS NOVA ERA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 6; -- Alleanza Odontologia <- Alleanza Odontologia
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 9; -- AÇAI TIMBU <- AÇAI TIMBU
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 13; -- BLESSED GRÃOS <- BLESSED GRÃOS
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = '2026-08-01' WHERE id = 15; -- CA SOLUTIONS LTDA <- CA SOLUTIONS LTDA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 40; -- CHURRASCARIA LOURO GRILL LTDA <- CHURRASCARIA LOURO GRILL LTDA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 16; -- CONSFEL CONSTRUÇÕES LTDA <- CONSFEL CONSTRUÇÕES LTDA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 14; -- Clinica miranda <- Clinica miranda
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 18; -- DANIEL - MERCADINHO COMPRE SEMPRE <- DANIEL - MERCADINHO COMPRE SEMPRE
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = '2026-09-01' WHERE id = 17; -- DJ PEDRO HENRICO LTDA <- DJ PEDRO HENRICO LTDA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 19; -- DS SOLUCOES LTDA <- DS SOLUCOES LTDA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 22; -- EUDINHO <- EUDINHO
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = '2026-04-01' WHERE id = 23; -- EVYLA ADVOGADA <- EVYLA ADVOGADA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 24; -- EXTRAPACK DISTRIBUIDORA LTDA. - ME <- EXTRAPACK DISTRIBUIDORA LTDA. - ME
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 20; -- Estrela Ester Belém <- Estrela Ester Belém
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = '2026-06-01' WHERE id = 21; -- Estrela Ester Curitiba <- Estrela Ester Curitiba
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 54; -- F F - ACADEMIA <- F F - ACADEMIA
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 26; -- FLANK BURGUER <- FLANK BURGUER
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = '2026-09-01' WHERE id = 25; -- Facundo Motos <- Facundo Motos
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 27; -- Fra Carnes <- Fra Carnes
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'terceiros', data_fim_cobranca = '2026-05-01' WHERE id = 55; -- Galpão Bar <- Galpão Bar
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 30; -- IRISNEI LTDA <- IRISNEI LTDA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 28; -- JEFFERSON LOPES <- JEFFERSON LOPES
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = '2026-09-01' WHERE id = 33; -- JF TECNOLOGIA LTDA <- JF TECNOLOGIA LTDA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 34; -- JG ALMEIDA <- JG ALMEIDA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 32; -- KATHARINE <- KATHARINE
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 29; -- Kelly MEI <- Kelly MEI
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 31; -- LAESTONCAR <- LAESTONCAR
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 35; -- LEBENISTE <- LEBENISTE
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 41; -- LUCAS VIEIRA <- LUCAS VIEIRA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 36; -- Leudo <- Leudo
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 37; -- Limas pastelaria <- Limas pastelaria
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 38; -- MATHEUS <- MATHEUS
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 39; -- MORALES MEDICAL SUPPORT LTDA <- MORALES MEDICAL SUPPORT LTDA
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 12; -- OCTOOBRAND MKT <- OCTOOBRAND MKT
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 44; -- PHOTONDEPLOY <- PHOTONDEPLOY
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 42; -- Pai e Filhos auto peças <- Pai e Filhos auto peças
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 45; -- Ponto do Pratinho <- Ponto do Pratinho
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 43; -- Preço Bom Mercadinho <- Preço Bom Mercadinho
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 51; -- RESTAURANTE O GORDIM <- RESTAURANTE O GORDIM
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 52; -- RR Albuquerque <- RR Albuquerque
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 53; -- RUMOS MOVEIS <- RUMOS MOVEIS
UPDATE cliente SET ativo = FALSE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = '2026-10-01' WHERE id = 46; -- Registre Clicks <- Registre Clicks
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 47; -- SALINAS <- SALINAS
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 48; -- Samara Psicologa <- Samara Psicologa
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_juridica', data_fim_cobranca = NULL WHERE id = 49; -- Samuel Alcantara <- Samuel Alcantara
UPDATE cliente SET ativo = TRUE, tipo_pagamento = 'pessoa_fisica', data_fim_cobranca = NULL WHERE id = 50; -- Tainara <- Tainara
COMMIT;