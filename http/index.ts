import express from 'express'
import { AddStudentSchema, AttendanceSchema, CreateClassSchema, LoginSchema, SignupSchema } from './types'
import { Attendance, Class, User } from './models'
import jwt, { type JwtPayload } from "jsonwebtoken"
import { authMiddleware, teacherRoleMiddleware } from './middleware'
import mongoose from 'mongoose'
import expressWs from 'express-ws'
const app = express()
expressWs(app)

let activeSesion: {classId:string,startedAt:Date,attendance:Record<string,string>} | null = null

app.ws("/ws",function(ws,req){
    try {
        const token = req.query.token
        const {userId,role} = jwt.verify(token,process.env.JWT_SECRET_KEY!) as JwtPayload
        
        ws.on('message',function(msg:string){
            console.log(msg)
        })
    } catch (error) {
        ws.send(JSON.stringify({
            "event":"ERROR",
            "data":{
                "message":"Incorrect token"
            }
        }))
        ws.close()
    }
})

app.post("/auth/signup",async (req,res) => {
    const {data,success} = SignupSchema.safeParse(req.body)
    if(!success){
        return res.status(400).json({
            "success": false,
            "error": "Invalid request schema",
        })
    }
    const user = await User.findOne({
        email:data.email
    })

    if(user){
        return res.status(400).json({
            "success": false,
            "error": "Email already exists"
        })
    }

    //TODO hash the password
    const userDb = await User.create({
        name: data.name,
        email: data.email,
        password: data.password
    })

    return res.status(200).json({
        success:true,
        data:{
            _id:userDb._id,
            name:userDb.name,
            email:userDb.email,
            password:userDb.password
        }
    })

})

app.post("/auth/login",async (req,res) => {
    const {data,success} = LoginSchema.safeParse(req.body)
    if(!success){
        return res.status(400).json({
            "success": false,
            "error": "Invalid request schema",
        })
    }

    const user = await User.findOne({email:data.email})

    if(!user || user.password != data.password){
        return res.status(400).json(
            {
                "success": false,
                "error": "Invalid email or password"
            }
        )
    }
    const token = jwt.sign({
        _id:user._id,
        role:user.role
    },process.env.JWT_SECRET_KEY!)

    return res.status(201).json({
        "success":true,
        "data":{
            "token":token
        }
    })
})

app.get("/auth/me",authMiddleware,async (req,res) => {
    const user = await User.findOne({
        _id:req.userId
    })

    if(!user){
        return res.status(400).json({
            message: "Control shouldn't reach here"
        })
    }

    return res.status(200).json({
        "success":true,
        "data":{
            "_id":user._id,
            "name":user.name,
            "email":user.email,
            "role":user.role
        }
    })
})

app.post("/class",authMiddleware,teacherRoleMiddleware,async (req,res) => {
    const {data,success} = CreateClassSchema.safeParse(req.body)
    if(!success){
        return res.status(400).json({
            "success": false,
            "error": "Invalid request schema",
        })
    }

    const classDb = await Class.create({
        className:data.className,
        teacherId:req.userId,
        studentIds:[]
    })

    return res.status(201).json({
        "success":true,
        "data":{
            _id:classDb._id,
            className:classDb.className,
            teacherId:classDb.teacherId,
            studentIds:classDb.studentIds
        }
    })
})

app.post("/class/:id/add-student",authMiddleware,teacherRoleMiddleware,async (req,res) => {
    const {success,data} = AddStudentSchema.safeParse(req.body)

    if(!success){
        return res.status(400).json({
            "success": false,
            "error": "Invalid request schema",
        })
    }

    const studentId = data.studentId

    const classDb = await Class.findOne({
        _id:req.params.id
    })

    if(!classDb){
        return res.status(404).json({
            "success":false,
            "error":"Class not found"
        })
    }

    if(classDb.teacherId !== req.userId){
        return res.status(403).json(
            {
                "success": false,
                "error": "Forbidden, not class teacher"
            }
        )
    }

    const userDb = await User.findOne({
        _id:studentId
    })

    if(!userDb){
        return res.status(404).json({
            "success":false,
            "error":"Student not found"
        })
    }

    classDb.studentIds.push(new mongoose.Types.ObjectId(studentId))
    await classDb.save()

    return res.status(201).json({
        "success":true,
        "data":{
            _id:classDb._id,
            className:classDb.className,
            teacherId:classDb.teacherId,
            studentId:classDb.studentIds
        }
    })
    
})

app.get("/class/:id",authMiddleware,teacherRoleMiddleware,async (req,res) => {

    const classDb = await Class.findOne({
        id: req.params.id
    })

    if(!classDb){
        return res.status(400).json({
            "success":false,
            "error": "Class not found"
        })
    }

    if(classDb.teacherId !== req.userId){
        return res.status(403).json(
            {
                "success": false,
                "error": "Forbidden, not class teacher"
            }
        )
    }

    const students = await User.find({
        _id: classDb.studentIds
    })

    return res.status(200).json({
        "success":true,
        "data":{
            _id:classDb._id,
            className:classDb.className,
            teacherId:classDb.teacherId,
            studentIds: students.map((s) => ({
                _id:s._id,
                name:s.name,
                email:s.email
            }))
        }
    })
})

app.get("/students",authMiddleware,teacherRoleMiddleware,async (req,res) => {
    const students = await User.find({
        role:"Student"
    })

    return res.status(200).json({
        "success":true,
        "data": students.map((s) => ({
            _id:s._id,
            name:s.name,
            email:s.email
        }))
    })

})

app.get("/class/:id/my-attendance",authMiddleware,async (req,res) => {
    const classId = req.params.id
    const userId = req.userId

    const attendance = await Attendance.findOne({
        classId,
        studentId:userId
    })
    
    if(attendance){
        return res.status(200).json(
            {
            "success": true,
            "data": {
                    "classId": classId,
                    "status": "present"
                }
            }
        )
    }else{
        return res.status(200).json(
            {
            "success": true,
            "data": {
                    "classId": classId,
                    "status": null
                }
            }
        )
    }
})

app.post("/attendance/start",authMiddleware,teacherRoleMiddleware,async (req,res) => {
    const {data,success} = AttendanceSchema.safeParse(req.body)
    if(!success){
        return res.status(400).json({
            "success":false,
            "error":"Invalid schema types"
        })
    }
    const classDb = await Class.findOne({
        _id:data.classId
    })

    if(!classDb || classDb.teacherId !== req.userId){
        return res.status(403).json(
            {
                "success": false,
                "error": "Forbidden, not class teacher"
            }
        )
    }

    activeSesion = {
        classId:classDb._id.toString(),
        startedAt:new Date(),
        attendance:{}
    }

    return res.status(200).json({
        "success":true,
        "data":{
            classId:activeSesion.classId,
            startedAt:activeSesion.startedAt
        }
    })

})

app.listen(3000)