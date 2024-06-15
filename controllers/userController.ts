import moment from "moment";
import bcrypt from 'bcrypt';
import { PROFILE } from "../models/profileModel";
import { USER } from "../models/userModel";
import mongoose from "mongoose";
import { Request, Response } from 'express';

interface updatedRequest extends Request {
    query: {
        id: string;
    };
}

export const addNewUser = async (req : Request, res : Response) => {
    try {

        let { userName, email, password, role, firstName, lastName, mobileNumber } = req.body;

        let profileImage = req.files?.filter((file : any) => file.fieldname === 'profileImage')[0]?.filename;

        if (!userName) {
            throw new Error('userName is required.')
        } else if (!password) {
            throw new Error('password is required.')
        } else if (!email) {
            throw new Error('email is required.')
        } else if (!role) {
            throw new Error('role is required.')
        }

        if (req.role === 'owner') {

            const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
            if (!emailRegex.test(email)) {
                throw new Error('Please provide a valid email address.');
            }

            const roleArray = ["owner", "master", "manager"]
            if (!roleArray.includes(role)) {
                throw new Error(`Please provide a valid role. Valid roles are: ${roleArray.join(', ')}`);
            }

            let isMail = await USER.findOne({ email: email , isDeleted : false  })
            if (isMail) throw new Error('This email user already exists.');

            let isUserName = await USER.findOne({ userName: userName , isDeleted : false });
            if (isUserName) throw new Error('this userName is already exists.')

            // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            // if (!passwordRegex.test(password)) {
            //     throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one digit.');
            // }

            if (password) {
                password = await bcrypt.hash(password, 10)
            }

            var newUser = await USER.create({
                userName,
                email,
                password,
                role: role,
                organizationId: req.organizationId,
                isDeleted: false,
            })

            var newProfile = await PROFILE.create({
                userId: newUser._id,
                firstName: firstName ? firstName : null,
                lastName: lastName ? lastName : null,
                profileImage: profileImage ? profileImage : null,
                mobileNumber: mobileNumber ? mobileNumber : null,
                isDeleted: false
            })

        } else {
            throw new Error('This API is accessible only for users with owner role.');
        }

        let profile : any = await PROFILE.findOne({ _id: newProfile._id }).populate({
            path: 'userId',
            select: "-password",
        });

        if (profile.profileImage) {
            profile.profileImage = `${req.protocol}://${req.get('host')}/images/${profile?.profileImage}`
        }

        res.status(200).json({
            status: 201,
            message: 'user created successfully',
            data: profile
        });

    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const getUserList = async (req : Request, res : Response) => {
    try {

        let response = [];  

        if (req.role === 'owner') {

            let allUsers = await USER.find({ isDeleted: false, organizationId: req.organizationId, _id: { $ne: req.userId } });

            for (const user of allUsers) {

                let profile : any = await PROFILE.findOne({ userId: user._id, isDeleted: false }).populate({
                    path: 'userId',
                    select: "-password",
                });

                if (profile.profileImage) {
                    profile.profileImage = `${req.protocol}://${req.get('host')}/images/${profile?.profileImage}`
                }

                response.push(profile)
            }

        } else {
            throw new Error('This API is accessible only for users with owner role.');
        }

        res.status(200).json({
            status: 201,
            message: 'users get successfully',
            data: response
        });

    } catch (error : any) {

        res.status(400).json({
            status: "Failed",
            message: error.message,
        });

    }
}

export const updateUserDetails = async (req : Request, res : Response) => {
    try {

        if (req.role === 'owner') {

            let { userName, firstName, lastName, password, role, email , mobileNumber} = req.body;

            let profileImage = req.files?.filter((file : any) => file.fieldname === 'profileImage')[0];

            if (!req.query.id) {
                throw new Error('please provide id in query.')
            } else if (!userName) {
                throw new Error('userName is required.')
            } else if (!email) {
                throw new Error('email is required.')
            } 

            let employeeFind : any = await PROFILE.findOne({ userId: req.query.id, isDeleted: false }).populate('userId')

            if (!employeeFind) {
                throw new Error('This user does not exist.');
            } else if (employeeFind?.isDeleted === true) {
                throw new Error('This user has already been deleted.')
            }

            const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
            if (!emailRegex.test(email)) {
                throw new Error('Please provide a valid email address.');
            }

            const emailFind : any = await USER.findOne({ email: email, isDeleted: false });
            if (emailFind && emailFind._id.toString() !== req.query.id) {
                throw new Error('This email user already exists.');
            }

            let isUserName : any = await USER.findOne({ userName: userName, isDeleted: false })
            if (isUserName && isUserName._id.toString() !== req.query.id) {
                throw new Error('This userName already exists.');
            }

            if (password) {
                password = await bcrypt.hash(password, 10)
            }

            // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            // if (!passwordRegex.test(password)) {
            //     throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one digit.');
            // }

            var updatedUser : any = await USER.findByIdAndUpdate(employeeFind.userId._id, {
                userName,
                email: email,
                password: password ? password : employeeFind.userId.password,
                role
            }, { new: true });

            var updatedProfile : any = await PROFILE.findOneAndUpdate(
                { userId: updatedUser._id },
                {
                    $set: {
                        firstName : firstName ? firstName : employeeFind.firstName,
                        lastName : lastName ? lastName : employeeFind.lastName,
                        mobileNumber : mobileNumber ? mobileNumber : employeeFind.mobileNumber,
                        profileImage: profileImage ? profileImage.filename : employeeFind.profileImage
                    }
                },
                { new: true }
            );

        } else {
            throw new Error('This API is accessible only for users with owner role.');
        }

        let profile : any = await PROFILE.findOne({ _id: updatedProfile._id, isDeleted: false }).populate('userId')
        if (profile.profileImage) {
            profile.profileImage = `${req.protocol}://${req.get('host')}/images/${profile?.profileImage}`
        }

        res.status(200).json({
            status: 201,
            message: 'User update successfully',
            data: profile
        });
    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const deleteUser = async (req : updatedRequest, res : Response) => {
    try {

        if (req.role === 'owner') {

            if (!req.query.id) {
                throw new Error('id is required in query.');
            } else if (!mongoose.Types.ObjectId.isValid(req.query.id)) {
                throw new Error('please provide valid objectId for userId.')
            }

            const user = await USER.findOne({ _id: req.query.id });

            if (!user) {
                throw new Error('This user does not exist.');
            } else if (user.isDeleted === true) {
                throw new Error('This user has already been deleted.')
            }

            await PROFILE.findOneAndUpdate(
                { userId: user._id }, {
                isDeleted: true,
            }, { new: true })

            await USER.findByIdAndUpdate(user._id, {
                isDeleted: true,
            }, { new: true })

        } else {
            throw new Error('This API is accessible only for users with owner role.');
        }

        res.status(202).json({
            status: 202,
            message: 'User deleted successfully.'
        })

    } catch (error : any) {
        res.status(400).json({
            status: 'Failed',
            message: error.message
        })
    }
}

export const getProfile = async (req : updatedRequest, res : Response) => {
    try {

        if (!req.query.id) {
            throw new Error('please provide a id in query.')
        } else if (!mongoose.Types.ObjectId.isValid(req.query.id)) {
            throw new Error('please provide valid objectId for userId.')
        }

        let User = await USER.findOne({ isDeleted: false, organizationId: req.organizationId, _id: req.query.id });

        if (!User) {
            throw new Error('user not found.');
        }

        let profile = await PROFILE.findOne({ userId: User._id, isDeleted: false }).populate({
            path: 'userId',
            // select: "-password",
        });

        if (profile?.profileImage) {
            profile.profileImage = `${req.protocol}://${req.get('host')}/images/${profile?.profileImage}`
        }

        res.status(200).json({
            status: 201,
            message: 'profile get successfully',
            data: profile
        });

    } catch (error : any) {

        res.status(400).json({
            status: "Failed",
            message: error.message,
        });

    }
}

// exports.updatePassword = async function (req, res, next) {
//     try {

//         const { id } = req.query;
//         const { password, confirmPassword } = req.body;

//         if (!id) {
//             throw new Error('please provide id in query parameter.')
//         } else if (!password) {
//             throw new Error('password is required.')
//         } else if (!confirmPassword) {
//             throw new Error('confirmPassword is required.')
//         }

//         if(password !== confirmPassword){
//             throw new Error('')
//         }

//         const organization = await ORGANIZATION.findOne({ _id: id }).populate("userId")
//         console.log("organization", organization);
//         req.body.password = await bcrypt.hash(req.body.password, 10);
//         var user = await USER.findByIdAndUpdate({ _id: organization.userId.id }, { password: req.body.password }, { new: true });
//         console.log(user);

//         res.status(200).json({
//             status: "success",
//             message: "Password updated successfully"
//         })
//     } catch (error) {
//         res.status(200).json({
//             status: "success",
//             message: error.message
//         })
//     }
// };