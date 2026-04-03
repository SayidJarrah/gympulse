package com.gymflow.exception

import java.util.UUID

class FavoriteNotFoundException(trainerId: UUID) :
    RuntimeException("Favorite for trainer $trainerId not found")
