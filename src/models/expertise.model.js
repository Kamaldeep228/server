import mongoose,{Schema} from "mongoose";

// Define individual skill schema
const expertiseSchema = new Schema({
    name: {
      type: String,
      required: [true, "expertise name is required"],  // Adds custom error message
    },
  }, { _id: false });  // Prevents creating _id for each skill

const expertisesSchema =  new Schema({
    expertise: {
      type: [expertiseSchema],
    }
},{timestamps: true})

export const Expertise = mongoose.model("expertise", expertisesSchema)