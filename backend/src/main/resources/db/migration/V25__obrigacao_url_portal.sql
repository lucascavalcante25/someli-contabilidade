-- Link rápido (portal oficial) por tipo de obrigação + seeds conhecidos.

ALTER TABLE obrigacao
    ADD COLUMN IF NOT EXISTS url_portal VARCHAR(500);

UPDATE obrigacao SET url_portal = 'https://login.esocial.gov.br/login.aspx'
WHERE nome = 'eSocial' AND (url_portal IS NULL OR url_portal = '');

UPDATE obrigacao SET url_portal = 'https://www8.receita.fazenda.gov.br/SimplesNacional/'
WHERE nome IN ('PGDAS-D', 'DAS') AND (url_portal IS NULL OR url_portal = '');

UPDATE obrigacao SET url_portal = 'https://fgtsdigital.caixa.gov.br/'
WHERE nome IN ('FGTS Digital', 'FGTS') AND (url_portal IS NULL OR url_portal = '');

UPDATE obrigacao SET url_portal = 'https://cav.receita.fazenda.gov.br/autenticacao/login'
WHERE nome = 'DCTFWeb' AND (url_portal IS NULL OR url_portal = '');
