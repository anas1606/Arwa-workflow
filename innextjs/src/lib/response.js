export const successResponse = (res, message, data = null, meta = null, statusCode = 200) => {
    const response = {
        success: true,
        message,
    };
    if (data) response.data = data;
    if (meta) response.meta = meta;
    
    return res.status(statusCode).json(response);
};

export const errorResponse = (res, message, error = null, statusCode = 400) => {
    const response = {
        success: false,
        message,
    };
    if (error) response.error = error;
    
    return res.status(statusCode).json(response);
};
