from pydantic import (
    BaseModel,
    Field,
    HttpUrl,
    field_validator,
)


class BackendCreate(BaseModel):
    id: str = Field(
        pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$"
    )

    name: str = Field(
        min_length=2,
        max_length=100,
    )

    url: HttpUrl

    weight: int = Field(
        default=1,
        ge=1,
        le=100,
    )

    @field_validator("url")
    @classmethod
    def no_path_query_fragment(
        cls,
        value: HttpUrl,
    ) -> HttpUrl:
        if value.query or value.fragment:
            raise ValueError(
                "Backend URL cannot contain query or fragment"
            )

        return value


class BackendUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    url: HttpUrl | None = None

    weight: int | None = Field(
        default=None,
        ge=1,
        le=100,
    )


class AlgorithmUpdate(BaseModel):
    algorithm: str