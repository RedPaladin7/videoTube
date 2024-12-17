const asyncHandler = (requestHandler)=>{
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err)=>next(err))
    }
}

// every request may fail or take some time hence all of them will
// be needed to wrapped in async and try catch blocks

export {asyncHandler}