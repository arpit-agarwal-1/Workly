function validateCreateTeam(body) {
    const data = body || {};

    if (
        typeof data.name !== 'string' ||
        !data.name.trim() ||
        data.name.trim().length > 100
    ) {
        return {
            error: {
                message: 'Team name is required and must be 100 characters or fewer.',
            },
        };
    }

    if (
        data.description !== undefined &&
        (typeof data.description !== 'string' ||
            data.description.trim().length > 500)
    ) {
        return {
            error: {
                message: 'Team description must be 500 characters or fewer.',
            },
        };
    }

    return {
        value: {
            name: data.name.trim(),
            description:
                data.description === undefined
                    ? ''
                    : data.description.trim(),
        },
    };
}

function validateUpdateTeam(body) {
    const data = body || {};

    if (Object.keys(data).length === 0) {
        return {
            error: {
                message: 'At least one field is required.',
            },
        };
    }

    const value = {};

    if (data.name !== undefined) {
        if (
            typeof data.name !== 'string' ||
            !data.name.trim() ||
            data.name.trim().length > 100
        ) {
            return {
                error: {
                    message:
                        'Team name must be between 1 and 100 characters.',
                },
            };
        }

        value.name = data.name.trim();
    }

    if (data.description !== undefined) {
        if (
            typeof data.description !== 'string' ||
            data.description.trim().length > 500
        ) {
            return {
                error: {
                    message:
                        'Team description must be 500 characters or fewer.',
                },
            };
        }

        value.description = data.description.trim();
    }

    return { value };
}

module.exports = {
    validateCreateTeam,
    validateUpdateTeam,
};