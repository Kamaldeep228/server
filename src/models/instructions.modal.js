import mongoose,{Schema} from "mongoose";

const instructionsSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    instructions: {
        type: String,
        required: true,
    }
},{timestamps: true})

export const Instructions = mongoose.model("Instructions", instructionsSchema)