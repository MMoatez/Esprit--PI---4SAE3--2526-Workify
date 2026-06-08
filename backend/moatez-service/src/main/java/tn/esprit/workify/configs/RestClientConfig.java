package tn.esprit.workify.configs;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

@Configuration
public class RestClientConfig {

    @Bean
    @LoadBalanced
    public RestTemplate loadBalancedRestTemplate(
            @Value("${ai.receipt.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${ai.receipt.read-timeout-ms:15000}") int readTimeoutMs) {
        return buildRestTemplate(connectTimeoutMs, readTimeoutMs);
    }

    @Bean
    public RestTemplate directRestTemplate(
            @Value("${ai.receipt.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${ai.receipt.read-timeout-ms:15000}") int readTimeoutMs) {
        return buildRestTemplate(connectTimeoutMs, readTimeoutMs);
    }

    private RestTemplate buildRestTemplate(int connectTimeoutMs, int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return new RestTemplate(factory);
    }
}
