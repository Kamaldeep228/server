import mongoose,{Schema} from "mongoose";

const cookiesSchema = new Schema({
    cookies: {
        type: String,
        required: true,
    }
},{timestamps: true})

export const Cookies = mongoose.model("Cookies", cookiesSchema)