package tn.esprit.workify;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
// import org.springframework.cloud.client.discovery.EnableDiscoveryClient; // Desactive temporairement
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
// @EnableDiscoveryClient // Desactive temporairement
public class WorkifyApplication {

    public static void main(String[] args) {
        SpringApplication.run(WorkifyApplication.class, args);
    }

}
