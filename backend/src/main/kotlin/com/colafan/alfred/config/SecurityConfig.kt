package com.colafan.alfred.config

import com.colafan.alfred.security.JwtAuthenticationFilter
import com.colafan.alfred.security.UserDetailsServiceImpl
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.dao.DaoAuthenticationProvider
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig(
    private val userDetailsServiceImpl: UserDetailsServiceImpl,
    private val jwtAuthenticationFilter: JwtAuthenticationFilter
) {

    @Bean
    fun passwordEncoder(): PasswordEncoder {
        return org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder()
    }

    @Bean
    fun authenticationManager(
        httpSecurity: HttpSecurity): AuthenticationManager {
        val builder = httpSecurity.getSharedObject(AuthenticationManagerBuilder::class.java)
        val provider = DaoAuthenticationProvider()
        provider.setUserDetailsService(userDetailsServiceImpl)
        provider.setPasswordEncoder(passwordEncoder())
        builder.authenticationProvider(provider)
        return builder.build()
    }

    @Bean
    fun securityFilterChain(
        http: HttpSecurity
    ): SecurityFilterChain {
        http.csrf { it.disable() }
        http.cors { it.disable() }  // CORS 由自定义 CorsFilter 处理
        http.authorizeHttpRequests { auth ->
            auth
                .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/test", "/error", "/actuator/**")
                .permitAll()
                .anyRequest()
                .authenticated()
        }
        http.sessionManagement {
            it.sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.STATELESS)
        }
        http.authenticationProvider(
            DaoAuthenticationProvider().apply {
                setUserDetailsService(userDetailsServiceImpl)
                setPasswordEncoder(passwordEncoder())
            }
        )
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)
        http.formLogin { it.disable() }
        http.httpBasic { it.disable() }

        return http.build()
    }
}
