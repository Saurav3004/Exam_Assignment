import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken"

export const authMiddleware = (req:Request,res:Response,next:NextFunction) => {
    const token = req.headers.authorization;

    if(!token){
        return res.status(401).json({
            "success": false,
            "error": "Unauthorized, token missing or invalid"
        })
    }
    try {
        
        const {userId,role} = jwt.verify(token,process.env.JWT_SECRET_KEY!)  as JwtPayload
        req.userId = userId
        req.role = role
        next()
    } catch (error) {
        return res.status(401).json({
            "success": false,
            "error": "Unauthorized, token missing or invalid"
        })
    }


}

export const teacherRoleMiddleware = (req:Request,res:Response,next:NextFunction) => {
    if(!req.role || req.role !== "Teacher"){
        return res.status(400).json(
            {
                "success": false,
                "error": "Forbidden, teacher access required"
}
        )
    }
    next()    
}