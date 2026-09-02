package br.com.someli.service;

import br.com.someli.domain.MensagemDiaria;
import br.com.someli.dto.MensagemDiariaDTO;
import br.com.someli.repository.MensagemDiariaRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class MensagemDiariaService {

    private final MensagemDiariaRepository mensagemDiariaRepository;

    public MensagemDiariaService(MensagemDiariaRepository mensagemDiariaRepository) {
        this.mensagemDiariaRepository = mensagemDiariaRepository;
    }

    public MensagemDiariaDTO obterDeHoje() {
        return obterPorData(LocalDate.now());
    }

    public MensagemDiariaDTO obterPorData(LocalDate data) {
        int diaAno = data.getDayOfYear();
        // Ano não bissexto: dia 365; bissexto usa até 366. Se faltar o 366, usa 365.
        MensagemDiaria msg = mensagemDiariaRepository.findByDiaAnoAndAtivoTrue(diaAno)
                .or(() -> mensagemDiariaRepository.findByDiaAnoAndAtivoTrue(Math.min(diaAno, 365)))
                .orElse(null);
        if (msg == null) {
            MensagemDiariaDTO fallback = new MensagemDiariaDTO();
            fallback.setDiaAno(diaAno);
            fallback.setTexto("O Senhor é bom; a sua misericórdia dura para sempre. Confie em Cristo hoje.");
            fallback.setReferencia("Salmos 100:5");
            fallback.setTipo("versiculo");
            return fallback;
        }
        return toDto(msg);
    }

    private MensagemDiariaDTO toDto(MensagemDiaria m) {
        MensagemDiariaDTO dto = new MensagemDiariaDTO();
        dto.setId(m.getId());
        dto.setDiaAno(m.getDiaAno());
        dto.setTexto(m.getTexto());
        dto.setReferencia(m.getReferencia());
        dto.setTipo(m.getTipo());
        return dto;
    }
}
