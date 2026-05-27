package com.workify.formationservice.config;

import com.workify.formationservice.domain.Domain;
import com.workify.formationservice.domain.Formation;
import com.workify.formationservice.domain.Status;
import com.workify.formationservice.repository.FormationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

        private final FormationRepository formationRepository;

        @Override
        public void run(String... args) {
                if (formationRepository.count() == 0) {
                        log.info("Seeding initial formation data...");

                        Formation f1 = Formation.builder()
                                        .title("Masterclass Angular 17 & Micro-frontends")
                                        .description("Learn to build scalable enterprise applications with Angular 17, Signals, and Micro-frontend architecture.")
                                        .field(Domain.IT)
                                        .level(4)
                                        .status(Status.ONLINE)
                                        .period("5 days")
                                        .googleMeetLink("https://meet.google.com/abc-defg-hij")
                                        .build();

                        Formation f2 = Formation.builder()
                                        .title("Digital Marketing Strategy & Performance")
                                        .description("Master digital marketing tools, data analysis, and acquisition strategies to boost growth.")
                                        .field(Domain.MARKETING)
                                        .level(3)
                                        .status(Status.ONLINE)
                                        .period("2 weeks")
                                        .googleMeetLink("https://meet.google.com/mkt-data-perf")
                                        .build();

                        Formation f3 = Formation.builder()
                                        .title("Advanced UI/UX Design with Figma")
                                        .description("From user research to interactive prototyping, learn the best interface design techniques.")
                                        .field(Domain.DESIGN_CREATION)
                                        .level(2)
                                        .status(Status.ON_SITE)
                                        .period("3 days")
                                        .build();

                        Formation f4 = Formation.builder()
                                        .title("Network Security & Pentesting")
                                        .description("Become an offensive security expert. Learn pentesting, intrusion detection, and infrastructure security.")
                                        .field(Domain.SECURITY_NETWORK)
                                        .level(5)
                                        .status(Status.ONLINE)
                                        .period("1 month")
                                        .googleMeetLink("https://meet.google.com/sec-net-pent")
                                        .build();

                        formationRepository.saveAll(List.of(f1, f2, f3, f4));
                        log.info("Successfully seeded {} formations", formationRepository.count());
                }
        }
}
