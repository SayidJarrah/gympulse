package com.gymflow.exception

class InvalidSortFieldException(field: String) :
    RuntimeException("Invalid sort field: $field")
