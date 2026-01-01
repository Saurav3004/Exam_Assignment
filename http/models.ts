import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name:String,
    email:{type:String,unique:true},
    password:String,
    role:String
})

const ClassSchema = new mongoose.Schema({
    className:String,
    teacherId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    studentIds: [{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }]
})

const AttendanceSchema = new mongoose.Schema({
    classId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Class"
    },
    studentId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    status:String
})

export const User = mongoose.model("User",UserSchema)
export const Class = mongoose.model("Class",ClassSchema)
export const Attendance = mongoose.model("Attendance",AttendanceSchema)

