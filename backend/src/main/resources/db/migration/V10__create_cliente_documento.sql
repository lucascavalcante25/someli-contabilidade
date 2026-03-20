CREATE TABLE IF NOT EXISTS cliente_documento (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL,
    nome_arquivo VARCHAR(255),
    tipo_arquivo VARCHAR(50),
    url_arquivo TEXT,
    data_upload TIMESTAMP,
    descricao TEXT,
    CONSTRAINT fk_cliente_documento_cliente FOREIGN KEY (cliente_id) REFERENCES cliente(id) ON DELETE CASCADE
);

CREATE INDEX idx_cliente_documento_cliente ON cliente_documento(cliente_id);
