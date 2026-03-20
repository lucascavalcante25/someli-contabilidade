package br.com.someli;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SomeliApplication {

    public static void main(String[] args) {
        SpringApplication.run(SomeliApplication.class, args);
    }
}
