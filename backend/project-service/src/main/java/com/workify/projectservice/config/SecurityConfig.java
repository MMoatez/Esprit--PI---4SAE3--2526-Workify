package com.workify.projectservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                // ❌ Désactiver CSRF pour WebSocket
                .csrf(csrf -> csrf.disable())

                // ❌ Désactiver login par défaut Spring
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(form -> form.disable())

                .headers(headers -> headers
                        .frameOptions(frame -> frame.disable())
                )

                .authorizeHttpRequests(auth -> auth

                        // ✅ WebSocket PUR
                        .requestMatchers("/ws-notifications/**").permitAll()

                        // ✅ SockJS
                        .requestMatchers("/ws-notifications-sockjs/**").permitAll()

                        // ✅ Broker destinations
                        .requestMatchers("/topic/**").permitAll()
                        .requestMatchers("/queue/**").permitAll()
                        .requestMatchers("/app/**").permitAll()
                        .requestMatchers("/user/**").permitAll()

                        // ✅ API REST
                        .requestMatchers(HttpMethod.GET,  "/api/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/**").permitAll()

                        .anyRequest().permitAll()
                );

        return http.build();
    }
}