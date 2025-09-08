import { response } from "express";
import userModel from "../models/userModel.js";
import FormData from 'form-data';
import axios from "axios";


export const generateImage = async (req, res) => {
    try {
        const {userId, prompt}= req.body;
        const user=await userModel.findById(userId);
        if(!user||!prompt){
            return res.json({success:false,message:"User not found or prompt missing"});
        }
        if(user.creditBalance===0||user.creditBalance<0){
            return res.json({success:false,message:"Insufficient credits, please recharge", creditBalance:user.creditBalance});
        }
        const formData = new FormData()
        formData.append('prompt', prompt);
       const {data}= await axios.post('https://clipdrop-api.co/text-to-image/v1',formData,{
             headers: {'x-api-key': process.env.CLIPDROP_API, }, responseType: 'arraybuffer'})
        const base64Image = Buffer.from(data, 'binary').toString('base64');
        const resultImage=`data:image/png;base64,${base64Image}`;

        await userModel.findByIdAndUpdate(userId,{creditBalance: user.creditBalance-1});
        res.json({success:true, message:"Image generated successfully", creditBalance:user.creditBalance-1, resultImage});
    }
    catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
}