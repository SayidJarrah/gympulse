package com.gymflow.exception

import java.util.UUID

class AlreadyFavoritedException(trainerId: UUID) :
    RuntimeException("Trainer $trainerId is already in favorites")
