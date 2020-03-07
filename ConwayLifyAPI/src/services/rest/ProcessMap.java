package services.rest;

import javax.json.Json;
import javax.json.JsonObject;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import java.io.StringReader;
import java.util.List;

@Path("/")
public class ProcessMap {


    @POST
    @Path("/recalc_map")
    @Produces(MediaType.APPLICATION_JSON)
    public String getClichedMessage(String body) {
        JsonObject bodyObj = Json.createReader(new StringReader(body)).readObject();
        List<Integer> gameMap = bodyObj.getJsonArray("game_map").getValuesAs(jsonValue -> Integer.parseInt(jsonValue.toString()));
        return gameMap.toString();
    }
}
