import mongoose,{Schema} from "mongoose";

// Define individual skill schema
const profileSpecializationSchema = new Schema({
    name: {
      type: String,
      required: [true, "Profile specialization name is required"],  // Adds custom error message
    },
  }, { _id: false });  // Prevents creating _id for each skill

const profileSpecializationesSchema =  new Schema({
    profileSpecialization: {
      type: [profileSpecializationSchema],
    }
},{timestamps: true})

export const ProfileSpecialization = mongoose.model("profileSpecialization", profileSpecializationesSchema)