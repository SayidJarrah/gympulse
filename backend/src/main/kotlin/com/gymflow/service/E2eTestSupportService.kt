package com.gymflow.service

import com.gymflow.dto.E2eCleanupResponse
import com.gymflow.repository.MembershipPlanRepository
import com.gymflow.repository.UserMembershipRepository
import com.gymflow.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class E2eTestSupportService(
    private val membershipPlanRepository: MembershipPlanRepository,
    private val userRepository: UserRepository,
    private val userMembershipRepository: UserMembershipRepository
) {

    @Transactional
    fun cleanupByPrefixes(emailPrefixes: List<String>, planPrefixes: List<String>): E2eCleanupResponse {
        val normalizedEmailPrefixes = emailPrefixes
            .map(String::trim)
            .filter(String::isNotEmpty)
            .distinct()
        val normalizedPlanPrefixes = planPrefixes
            .map(String::trim)
            .filter(String::isNotEmpty)
            .distinct()

        val matchedUsers = normalizedEmailPrefixes
            .flatMap { prefix ->
                userRepository.findAllByEmailStartingWithOrEmailStartingWith(prefix, prefix.uppercase())
            }
            .distinctBy { it.id }

        val deletedMemberships = if (matchedUsers.isEmpty()) {
            0
        } else {
            val userIds = matchedUsers.map { it.id }
            val deletedCount = userMembershipRepository.deleteAllByUserIds(userIds)
            val distinctEmailPrefixes = matchedUsers
                .map { user -> normalizedEmailPrefixes.first { prefix -> user.email.startsWith(prefix) } }
                .distinct()
            for (prefix in distinctEmailPrefixes) {
                userRepository.deleteAllByEmailPrefixes(prefix, prefix.uppercase())
            }
            deletedCount
        }

        val matchedPlans = normalizedPlanPrefixes
            .flatMap { prefix -> membershipPlanRepository.findAllByNameStartingWith(prefix) }
            .distinctBy { it.id }

        if (matchedPlans.isNotEmpty()) {
            val distinctPlanPrefixes = matchedPlans
                .map { plan -> normalizedPlanPrefixes.first { prefix -> plan.name.startsWith(prefix) } }
                .distinct()
            for (prefix in distinctPlanPrefixes) {
                membershipPlanRepository.deleteAllByNameStartingWith(prefix)
            }
        }

        return E2eCleanupResponse(
            deletedUsers = matchedUsers.size,
            deletedMemberships = deletedMemberships,
            deletedPlans = matchedPlans.size
        )
    }
}
