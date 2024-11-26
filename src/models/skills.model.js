import mongoose,{Schema} from "mongoose";

// Define individual skill schema
const skillSchema = new Schema({
    name: {
      type: String,
      required: [true, "Skill name is required"],  // Adds custom error message
    },
  }, { _id: false });  // Prevents creating _id for each skill

const skillsSchema =  new Schema({
    skills: {
      type: [skillSchema],
    }
},{timestamps: true})

export const Skills = mongoose.model("skills", skillsSchema)