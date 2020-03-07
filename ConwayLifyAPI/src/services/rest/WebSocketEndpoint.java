package services.rest;

import javax.json.*;
import javax.websocket.OnMessage;
import javax.websocket.server.ServerEndpoint;
import java.io.StringReader;
import java.util.*;

@ServerEndpoint("/ws")
public class WebSocketEndpoint {


    @OnMessage(maxMessageSize = 99024000)
    public String handleTextMessage(String message) {
        JsonObject bodyObj = Json.createReader(new StringReader(message)).readObject();
        List<List<String>> writeMap = Collections.synchronizedList(new ArrayList<>());
        List<List<String>> readMap = new ArrayList<>();
        for (JsonArray rows : bodyObj.getJsonArray("game_map").getValuesAs(JsonArray.class)) {
            List<String> writeRowList = Collections.synchronizedList(new ArrayList<>());
            List<String> readRowList = new ArrayList<>();
            for (JsonString col : rows.getValuesAs(JsonString.class)) {
                readRowList.add(col.getString());
                writeRowList.add(col.getString());
            }
            writeMap.add(writeRowList);
            readMap.add(readRowList);
        }
        List<List<String>> THREAD_SAFE_LIST_READ;
        List<List<String>> THREAD_SAFE_LIST_WRITE;
        THREAD_SAFE_LIST_READ = Collections.unmodifiableList(readMap);
        THREAD_SAFE_LIST_WRITE = writeMap;
        List<Thread> workers = new ArrayList<>();
        Map<Integer, Integer> mapping = calBoundary(THREAD_SAFE_LIST_READ, bodyObj.getJsonNumber("workers").intValue());
        mapping.forEach((from, to) -> {
            workers.add(new Thread(() -> {
                updateConwayGrid(THREAD_SAFE_LIST_READ, THREAD_SAFE_LIST_WRITE, from, to);
            }));
        });
        workers.forEach(Thread::start);
        try {
            for (Thread worker : workers) {
                worker.join();
            }
        } catch (InterruptedException ignored) {
        }

        JsonArrayBuilder mapArray = Json.createArrayBuilder();
        THREAD_SAFE_LIST_WRITE.forEach(row -> {
            JsonArrayBuilder rowArr = Json.createArrayBuilder();
            row.forEach(rowArr::add);
            mapArray.add(rowArr.build());
        });
        return Json.createObjectBuilder().add("new_game_map", mapArray).build().toString();
    }

    int typeToNum(List<List<String>> map, int y, int x) {
        return y >= map.size() || y < 0 || x >= map.get(y).size() || x < 0 || !map.get(y).get(x).equals("selected") ? 0 : 1;
    }

    Map<Integer, Integer> calBoundary(List<List<String>> THREAD_SAFE_LIST_READ, int workers) {
        Map<Integer, Integer> mapping = new HashMap<>();
        int size = THREAD_SAFE_LIST_READ.size();
        int used = 0;
        int countOfRowsPerWorker = size / workers;

        for (int i = 0; i < workers; i++) {
            int offset = used;
            used = i == workers - 1 ? size : used + countOfRowsPerWorker;
            mapping.put(offset, used);
        }
        return mapping;
    }

    void updateConwayGrid(List<List<String>> copyMap, List<List<String>> gameMap, int from, int to) {
        for (int y = from; y < to; y++) {
        List<String> row = copyMap.get(y);
        for (int x = 0; x < row.size(); x++) {
            String cell = row.get(x);
            int total = this.typeToNum(copyMap, y, x - 1)
                    + this.typeToNum(copyMap, y, x + 1)
                    + this.typeToNum(copyMap, y - 1, x)
                    + this.typeToNum(copyMap, y + 1, x)
                    + this.typeToNum(copyMap, y - 1, x - 1)
                    + this.typeToNum(copyMap, y - 1, x + 1)
                    + this.typeToNum(copyMap, y + 1, x - 1)
                    + this.typeToNum(copyMap, y + 1, x + 1);

            if (cell.equals("selected") && (total < 2 || total > 3)) {
                gameMap.get(y).set(x, "nonselected");
            }
            if (cell.equals("nonselected") && total == 3) {
                gameMap.get(y).set(x, "selected");
            }
        }
        }
    }
}
