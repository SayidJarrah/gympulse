package com.gymflow.repository

import com.gymflow.domain.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface UserRepository : JpaRepository<User, UUID> {
    fun findByEmail(email: String): User?

    fun findAllByEmailStartingWithOrEmailStartingWith(
        firstPrefix: String,
        secondPrefix: String
    ): List<User>

    @Modifying
    @Query(
        """
        DELETE FROM User u
        WHERE u.email LIKE CONCAT(:firstPrefix, '%')
           OR u.email LIKE CONCAT(:secondPrefix, '%')
        """
    )
    fun deleteAllByEmailPrefixes(
        @Param("firstPrefix") firstPrefix: String,
        @Param("secondPrefix") secondPrefix: String
    ): Int
}
